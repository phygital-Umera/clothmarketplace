import {OrderStatus, PaymentStatus, Prisma} from '@prisma/client';
import prisma from '../client';
import {financialYear, round2} from '../utils/day';
import {gstRuleOf, rateFor, taxBreakup} from '../utils/gst';
import {stateCodeOfGstin, stateCodeOfName, stateName} from '../utils/gstStates';
import accountService from './account.service';

type Tx = Prisma.TransactionClient;

/*
 * Online-order GST invoices (D-20). Each shop has its own online series,
 * PREFIX/26-27/O0001 (at most 16 characters), separate from its counter
 * bills. An order gets its number once, when it is paid online or confirmed
 * (cash on delivery); the panel and the store print that one number.
 */

/** 2-4 letters of the shop's bill prefix (or code), so the number stays within 16 characters */
const seriesLetters = (shop: {code: string; billPrefix: string | null}) => {
    const given = (shop.billPrefix || shop.code).toUpperCase();
    if (/^[A-Z]{2,4}$/.test(given)) return given;
    const letters = given.replace(/[^A-Z]/g, '').slice(0, 4);
    return letters.length >= 2 ? letters : 'OS';
};

/** An order is invoiced once it is confirmed (or later) and, if paid online, the money is in */
const invoiceable = (o: {status: OrderStatus; paymentMethod: string; paymentStatus: PaymentStatus}) =>
    o.status !== OrderStatus.PENDING &&
    o.status !== OrderStatus.CANCELLED &&
    (o.paymentMethod !== 'ONLINE' || o.paymentStatus === PaymentStatus.PAID || o.paymentStatus === PaymentStatus.REFUNDED);

const INVOICE_INCLUDE = {
    shop: {
        select: {
            name: true,
            gstin: true,
            address: true,
            phone: true,
            gstRule: true,
            branch: {select: {city: true, state: true, postalCode: true}},
            company: {select: {name: true, state: true}},
        },
    },
    items: {include: {product: {select: {taxRate: true, hsnCode: true}}}},
} satisfies Prisma.OrderInclude;

class OrderInvoiceService {
    /**
     * Give the order its invoice number if it is due one and has none yet.
     * The shop row is locked so two orders of a shop never get the same number.
     */
    public async issue(tx: Tx, orderId: string): Promise<string | null> {
        const o = await tx.order.findUnique({
            where: {id: orderId},
            select: {
                invoiceNumber: true,
                shopId: true,
                status: true,
                paymentMethod: true,
                paymentStatus: true,
                shop: {select: {code: true, billPrefix: true}},
            },
        });
        if (!o || o.invoiceNumber || !o.shopId || !o.shop || !invoiceable(o)) {
            return o?.invoiceNumber ?? null;
        }
        await tx.$queryRaw`SELECT id FROM "Shop" WHERE id = ${o.shopId} FOR UPDATE`;
        const shopId = o.shopId;
        const number = await accountService.nextCode(
            tx,
            `${seriesLetters(o.shop)}/${financialYear()}/O`,
            4,
            async (p) =>
                (
                    await tx.order.findMany({
                        where: {shopId, invoiceNumber: {startsWith: p}},
                        select: {invoiceNumber: true},
                    })
                ).map((r) => r.invoiceNumber ?? ''),
        );
        await tx.order.update({
            where: {id: orderId},
            data: {invoiceNumber: number, invoiceDate: new Date()},
        });
        return number;
    }

    /**
     * Everything a GST invoice prints, worked out here once: the seller (the
     * shop, its GSTIN and state), place of supply (the delivery state), each
     * line's HSN, rate, taxable value and GST after the coupon share, and the
     * CGST + SGST or IGST split. Issues the number first if it is due.
     * Returns null while the order cannot be invoiced yet.
     */
    public async invoiceOf(orderId: string) {
        await prisma.$transaction((tx) => this.issue(tx, orderId));
        const o = await prisma.order.findUniqueOrThrow({
            where: {id: orderId},
            include: INVOICE_INCLUDE,
        });
        if (!o.invoiceNumber) return null;

        const address = (o.shippingAddress ?? {}) as Record<string, string | undefined>;
        const sellerCode =
            stateCodeOfGstin(o.shop?.gstin) ??
            stateCodeOfName(o.shop?.branch?.state) ??
            stateCodeOfName(o.shop?.company?.state);
        const placeCode = stateCodeOfName(address.state) ?? sellerCode;
        const rule = gstRuleOf(o.shop?.gstRule);
        // The coupon is shared over the lines by value, as in checkout and refunds
        const share = o.subtotal > 0 ? (o.subtotal - o.couponDiscount) / o.subtotal : 1;

        const lines = o.items.map((i) => {
            const value = round2(i.totalPrice * share);
            const taxRate = i.taxRate ?? rateFor(rule, i.product.taxRate, value / Math.max(1, i.quantity));
            const taxable = round2(value / (1 + taxRate / 100));
            return {
                id: i.id,
                name: i.productName,
                size: i.size,
                color: i.color,
                hsnCode: i.hsnCode ?? i.product.hsnCode ?? null,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                taxRate,
                totalPrice: value,
                taxable,
                tax: round2(value - taxable),
            };
        });

        return {
            invoiceNumber: o.invoiceNumber,
            invoiceDate: o.invoiceDate,
            orderId: o.id,
            orderNumber: o.orderNumber,
            orderDate: o.createdAt,
            status: o.status,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            seller: {
                name: o.shop?.name ?? o.shop?.company?.name ?? null,
                gstin: o.shop?.gstin ?? null,
                address: o.shop?.address ?? null,
                city: o.shop?.branch?.city ?? null,
                postalCode: o.shop?.branch?.postalCode ?? null,
                phone: o.shop?.phone ?? null,
                stateCode: sellerCode,
                state: stateName(sellerCode),
            },
            buyer: {
                name: address.recipient ?? null,
                phone: address.phone ?? null,
                address1: address.address1 ?? null,
                address2: address.address2 ?? null,
                city: address.city ?? null,
                state: address.state ?? null,
                postalCode: address.postalCode ?? null,
            },
            lines,
            subtotal: o.subtotal,
            couponCode: o.couponCode,
            couponDiscount: o.couponDiscount,
            shippingFee: o.shippingFee,
            totalAmount: o.totalAmount,
            taxBreakup: taxBreakup(
                lines,
                {code: sellerCode, name: stateName(sellerCode)},
                {code: placeCode, name: stateName(placeCode)},
            ),
        };
    }
}

export default new OrderInvoiceService();
