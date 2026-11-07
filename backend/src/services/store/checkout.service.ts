import crypto from 'crypto';
import httpStatus from 'http-status';
import {MovementType, OrderStatus, PaymentStatus, Prisma, StockSourceType} from '@prisma/client';
import {z} from 'zod';
import prisma from '../../client';
import ApiError from '@utils/ApiError';
import {config} from '@config/index';
import {notify} from '../notification.service';
import inventoryService from '../inventory.service';
import customerService, {DELIVERY_OPTIONS} from './customer.service';

/*
 * Checkout: the bag becomes one order per shop (each shop ships from its own
 * branch stock). The coupon is shared over the orders by value; the delivery
 * fee goes on the first order. Stock is taken when the orders are placed.
 *
 * Online payment uses Razorpay: one Razorpay order covers all the shop orders
 * of a checkout. An order is only marked PAID after Razorpay's signature is
 * verified with the key secret; the client can never mark it paid itself.
 */

const round2 = (v: number) => Math.round(v * 100) / 100;

export const checkoutSchema = z.object({
    addressId: z.string({required_error: 'Choose a delivery address'}).uuid('Choose a delivery address'),
    delivery: z.enum(DELIVERY_OPTIONS).default('STANDARD'),
    paymentMethod: z.enum(['COD', 'ONLINE'], {errorMap: () => ({message: 'Choose how to pay'})}),
    couponCode: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(300).optional(),
});

export const verifySchema = z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
});

export const paymentRefSchema = z.object({
    razorpayOrderId: z.string().min(1),
    reason: z.string().trim().max(300).optional(),
});

const razorpayReady = () => !!config.razorpay.keyId && !!config.razorpay.keySecret;

const razorpayCreateOrder = async (amountPaise: number, receipt: string, notes: Record<string, string>) => {
    const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Basic ${auth}`},
        body: JSON.stringify({amount: amountPaise, currency: 'INR', receipt, notes}),
    });
    const body = (await res.json().catch(() => ({}))) as {id?: string; error?: {description?: string}};
    if (!res.ok || !body.id) {
        throw new ApiError(
            httpStatus.BAD_GATEWAY,
            `Online payment could not be started: ${body.error?.description ?? 'Razorpay did not respond'}. Try again or choose Cash on delivery.`,
        );
    }
    return body.id;
};

const orderNumber = () =>
    `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

class CheckoutService {
    public paymentConfig() {
        return {online: razorpayReady(), provider: razorpayReady() ? 'razorpay' : null, keyId: config.razorpay.keyId ?? null};
    }

    private async paymentInfo(userId: string, razorpayOrderId: string) {
        const [orders, user] = await Promise.all([
            this.ordersOfPayment(userId, razorpayOrderId),
            prisma.user.findUniqueOrThrow({where: {id: userId}, select: {fullname: true, email: true, phoneNumber: true}}),
        ]);
        const total = round2(orders.reduce((t, o) => t + o.totalAmount, 0));
        return {
            provider: 'razorpay' as const,
            keyId: config.razorpay.keyId!,
            razorpayOrderId,
            amount: Math.round(total * 100),
            currency: 'INR',
            prefill: {name: user.fullname, email: user.email ?? undefined, contact: user.phoneNumber},
        };
    }

    private async ordersOfPayment(userId: string, razorpayOrderId: string) {
        const orders = await prisma.order.findMany({
            where: {customerId: userId, paymentDetails: {path: ['razorpayOrderId'], equals: razorpayOrderId}},
            include: {items: true},
        });
        if (!orders.length) throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
        return orders;
    }

    public async checkout(userId: string, data: z.infer<typeof checkoutSchema>) {
        if (data.paymentMethod === 'ONLINE' && !razorpayReady()) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Online payment is not set up yet. Please choose Cash on delivery.');
        }
        const [cart, address, user] = await Promise.all([
            customerService.getCart(userId, {delivery: data.delivery}),
            prisma.customerAddress.findFirst({where: {id: data.addressId, userId}}),
            prisma.user.findUniqueOrThrow({where: {id: userId}, select: {fullname: true, email: true, phoneNumber: true}}),
        ]);
        if (!cart.items.length) throw new ApiError(httpStatus.BAD_REQUEST, 'Your bag is empty');
        if (cart.hasProblems) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Some items in your bag are out of stock or unavailable. Update your bag first.');
        }
        if (!address) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a delivery address');

        const coupon = data.couponCode ? await customerService.couponFor(userId, data.couponCode, cart.items) : null;

        // One order per shop
        const groups = new Map<string, typeof cart.items>();
        for (const l of cart.items) groups.set(l.shopId ?? '', [...(groups.get(l.shopId ?? '') ?? []), l]);
        const shops = await prisma.shop.findMany({
            where: {id: {in: [...groups.keys()]}},
            select: {id: true, branchId: true, companyId: true},
        });

        // Store prices include GST; keep the GST inside each order for the shop's invoice and reports
        const rates = new Map(
            (await prisma.product.findMany({where: {id: {in: cart.items.map((l) => l.productId)}}, select: {id: true, taxRate: true}})).map((p) => [p.id, p.taxRate ?? 0]),
        );
        const deliveryFee = cart.summary.deliveryFee;
        const plans = [...groups.entries()].map(([shopId, lines], i) => {
            const shop = shops.find((s) => s.id === shopId)!;
            const subtotal = round2(lines.reduce((t, l) => t + l.lineTotal, 0));
            const couponDiscount = round2(lines.reduce((t, l) => t + (coupon?.share.get(l.id) ?? 0), 0));
            const fee = i === 0 ? deliveryFee : 0;
            const tax = round2(
                lines.reduce((t, l) => {
                    const rate = rates.get(l.productId) ?? 0;
                    const paid = l.lineTotal - (coupon?.share.get(l.id) ?? 0);
                    return t + (paid * rate) / (100 + rate);
                }, 0),
            );
            return {shop, lines, subtotal, couponDiscount, fee, tax, total: round2(subtotal - couponDiscount + fee), number: orderNumber()};
        });
        const grandTotal = round2(plans.reduce((t, p) => t + p.total, 0));

        const razorpayOrderId =
            data.paymentMethod === 'ONLINE'
                ? await razorpayCreateOrder(Math.round(grandTotal * 100), plans[0].number, {orders: plans.map((p) => p.number).join(',')})
                : null;

        const shippingAddress = {
            recipient: address.recipient,
            phone: address.phone,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            district: address.district,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            label: address.label,
            delivery: data.delivery,
            contact: {name: user.fullname, email: user.email, phone: user.phoneNumber},
        };

        const created = await prisma.$transaction(async (tx) => {
            const orders = [];
            for (const plan of plans) {
                const order = await tx.order.create({
                    data: {
                        orderNumber: plan.number,
                        customerId: userId,
                        companyId: plan.shop.companyId,
                        branchId: plan.shop.branchId,
                        shopId: plan.shop.id,
                        status: OrderStatus.PENDING,
                        paymentStatus: PaymentStatus.PENDING,
                        paymentMethod: data.paymentMethod,
                        subtotal: plan.subtotal,
                        discount: 0,
                        couponDiscount: plan.couponDiscount,
                        tax: plan.tax,
                        couponCode: plan.couponDiscount > 0 ? coupon!.code : null,
                        shippingFee: plan.fee,
                        totalAmount: plan.total,
                        shippingAddress: shippingAddress as Prisma.InputJsonValue,
                        notes: data.notes,
                        paymentDetails: razorpayOrderId ? {razorpayOrderId} : undefined,
                        items: {
                            create: plan.lines.map((l) => ({
                                productId: l.productId,
                                variantId: l.variantId,
                                quantity: l.quantity,
                                unitPrice: l.price,
                                totalPrice: l.lineTotal,
                                productName: l.name,
                                size: l.size,
                                color: l.color,
                                image: l.image,
                            })),
                        },
                        statusHistory: {
                            create: {
                                status: OrderStatus.PENDING,
                                comment: data.paymentMethod === 'COD' ? 'Order placed · Cash on delivery' : 'Order placed · waiting for online payment',
                                updatedById: userId,
                            },
                        },
                    },
                });
                // Fails the whole checkout if someone else bought the last piece meanwhile
                await inventoryService.applyStockChanges(tx, {
                    branchId: plan.shop.branchId,
                    changes: plan.lines.map((l) => ({variantId: l.variantId, productId: l.productId, delta: -l.quantity, type: MovementType.SALE_OUT})),
                    reason: `Online order ${plan.number}`,
                    reference: plan.number,
                    sourceType: StockSourceType.ORDER,
                    sourceId: order.id,
                    performedById: userId,
                });
                orders.push(order);
            }
            if (coupon) {
                await tx.coupon.update({where: {id: coupon.id}, data: {usedCount: {increment: 1}}});
                const first = orders.find((o) => o.couponDiscount > 0) ?? orders[0];
                await tx.couponUsage.create({data: {couponId: coupon.id, userId, orderId: first.id, discountAmount: coupon.discount}});
            }
            await tx.cartItem.deleteMany({where: {cart: {userId}}});
            if (data.paymentMethod === 'COD') {
                for (const o of orders) {
                    await notify(tx, userId, {
                        type: 'ORDER',
                        title: 'Order placed',
                        body: `Thank you! Order ${o.orderNumber} for ₹${o.totalAmount.toLocaleString('en-IN')} is placed. Pay in cash when it arrives.`,
                        link: `/account/orders/${o.id}`,
                    });
                }
            }
            return orders;
        });

        return {
            orders: created.map((o) => ({id: o.id, orderNumber: o.orderNumber, totalAmount: o.totalAmount})),
            total: grandTotal,
            paymentMethod: data.paymentMethod,
            payment: razorpayOrderId ? await this.paymentInfo(userId, razorpayOrderId) : null,
        };
    }

    /** Razorpay's success handler: check the signature, then mark the orders paid */
    public async verify(userId: string, data: z.infer<typeof verifySchema>) {
        if (!razorpayReady()) throw new ApiError(httpStatus.BAD_REQUEST, 'Online payment is not set up');
        const orders = await this.ordersOfPayment(userId, data.razorpayOrderId);
        const expected = crypto
            .createHmac('sha256', config.razorpay.keySecret!)
            .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
            .digest('hex');
        const valid =
            expected.length === data.razorpaySignature.length &&
            crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(data.razorpaySignature));
        if (!valid) throw new ApiError(httpStatus.BAD_REQUEST, 'Payment could not be verified. If money was taken, it will be refunded by your bank.');

        await prisma.$transaction(
            orders
                .filter((o) => o.paymentStatus !== PaymentStatus.PAID)
                .flatMap((o) => [
                    prisma.order.update({
                        where: {id: o.id},
                        data: {
                            paymentStatus: PaymentStatus.PAID,
                            status: o.status === OrderStatus.PENDING ? OrderStatus.CONFIRMED : o.status,
                            paymentDetails: {...((o.paymentDetails as object) ?? {}), razorpayPaymentId: data.razorpayPaymentId, paidAt: new Date().toISOString()},
                        },
                    }),
                    prisma.orderStatusHistory.create({
                        data: {orderId: o.id, status: OrderStatus.CONFIRMED, comment: `Paid online (Razorpay ${data.razorpayPaymentId})`, updatedById: userId},
                    }),
                    notify(prisma, userId, {
                        type: 'PAYMENT',
                        title: 'Payment received',
                        body: `We received ₹${o.totalAmount.toLocaleString('en-IN')} for order ${o.orderNumber}. It is confirmed.`,
                        link: `/account/orders/${o.id}`,
                    }),
                ]),
        );
        return {paid: true, orders: orders.map((o) => ({id: o.id, orderNumber: o.orderNumber}))};
    }

    /** The customer closed Razorpay or the bank declined: note it, keep the orders */
    public async failed(userId: string, data: z.infer<typeof paymentRefSchema>) {
        const orders = await this.ordersOfPayment(userId, data.razorpayOrderId);
        await prisma.$transaction(
            orders
                .filter((o) => o.paymentStatus !== PaymentStatus.PAID)
                .map((o) =>
                    prisma.order.update({
                        where: {id: o.id},
                        data: {
                            paymentStatus: PaymentStatus.FAILED,
                            paymentDetails: {...((o.paymentDetails as object) ?? {}), lastError: data.reason ?? 'Payment was not completed'},
                        },
                    }),
                ),
        );
        return this.status(userId, data.razorpayOrderId);
    }

    /** Pay again for the same orders (Razorpay allows several attempts per order) */
    public async retry(userId: string, razorpayOrderId: string) {
        if (!razorpayReady()) throw new ApiError(httpStatus.BAD_REQUEST, 'Online payment is not set up');
        const orders = await this.ordersOfPayment(userId, razorpayOrderId);
        if (orders.every((o) => o.paymentStatus === PaymentStatus.PAID)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This order is already paid');
        }
        if (orders.some((o) => o.status === OrderStatus.CANCELLED)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This order was cancelled');
        }
        return this.paymentInfo(userId, razorpayOrderId);
    }

    /** Give up on online payment and pay cash when it arrives */
    public async switchToCod(userId: string, razorpayOrderId: string) {
        const orders = await this.ordersOfPayment(userId, razorpayOrderId);
        if (orders.some((o) => o.paymentStatus === PaymentStatus.PAID)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This order is already paid');
        }
        await prisma.$transaction(
            orders.flatMap((o) => [
                prisma.order.update({where: {id: o.id}, data: {paymentMethod: 'COD', paymentStatus: PaymentStatus.PENDING}}),
                prisma.orderStatusHistory.create({data: {orderId: o.id, status: o.status, comment: 'Changed to Cash on delivery', updatedById: userId}}),
            ]),
        );
        return this.status(userId, razorpayOrderId);
    }

    public async status(userId: string, razorpayOrderId: string) {
        const orders = await this.ordersOfPayment(userId, razorpayOrderId);
        return {
            razorpayOrderId,
            paymentMethod: orders[0].paymentMethod,
            paymentStatus: orders.every((o) => o.paymentStatus === PaymentStatus.PAID)
                ? 'PAID'
                : orders.some((o) => o.paymentStatus === PaymentStatus.FAILED)
                  ? 'FAILED'
                  : 'PENDING',
            lastError: (orders[0].paymentDetails as {lastError?: string} | null)?.lastError ?? null,
            total: round2(orders.reduce((t, o) => t + o.totalAmount, 0)),
            orders: orders.map((o) => ({id: o.id, orderNumber: o.orderNumber, totalAmount: o.totalAmount, items: o.items.length})),
            address: orders[0].shippingAddress,
        };
    }
}

export default new CheckoutService();
