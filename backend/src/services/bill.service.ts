import httpStatus from 'http-status';
import {
    BillPaymentStatus,
    BillStatus,
    CreditNoteStatus,
    MovementType,
    Prisma,
    SalesBillType,
    StockSourceType,
} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {listArgs, toListResult} from '../utils/list';
import {billValidation} from '@validations/index';
import accountService from './account.service';
import inventoryService, {StockChange} from './inventory.service';
import {ShopScope} from './shopProduct.service';
import {syncCustomerFromBill} from './customerLedger';
import {dayKey, financialYear} from '../utils/day';
import {rateFor, taxBreakup} from '../utils/gst';
import {stateCodeOfGstin, stateCodeOfName, stateName} from '../utils/gstStates';
import shopGstService from './shopGst.service';
import companySettingsService from './companySettings.service';

type Tx = Prisma.TransactionClient;

/** Most rows one Excel export may have (P4-11) */
const EXPORT_CAP = 5000;
type CreatePurchase = z.infer<typeof billValidation.createPurchaseBillSchema>;
type UpdatePurchase = z.infer<typeof billValidation.updatePurchaseBillSchema>;
type CreateSales = z.infer<typeof billValidation.createSalesBillSchema>;
type UpdateSales = z.infer<typeof billValidation.updateSalesBillSchema>;
type PreviewSales = z.infer<typeof billValidation.previewSalesBillSchema>;
type BillList = z.infer<typeof billValidation.billListSchema>;
type BranchSalesList = z.infer<typeof billValidation.branchSalesListSchema>;
type BranchSalesSummary = z.infer<typeof billValidation.branchSalesSummarySchema>;

/** One shop (shop admin) or every shop of a branch (branch admin, read only) */
export type BillScope = {companyId: string; shopId?: string; branchId?: string};

const scopeWhere = (scope: BillScope) => ({
    companyId: scope.companyId,
    ...(scope.shopId ? {shopId: scope.shopId} : {branchId: scope.branchId}),
});
type RecordPayment = z.infer<typeof billValidation.recordPaymentSchema>;
type Payment = {mode: string; amount: number};

/*
 * Shop billing. Inventory is never changed directly here: every stock effect
 * is the difference between what a bill has already posted and what it
 * should post now, applied through inventoryService.applyStockChanges in the
 * same transaction as the bill write. Re-saving an unchanged bill therefore
 * posts nothing, and a failed stock check rolls the whole bill back.
 */

export type Kind = 'PURCHASE' | 'SALES';

const KIND = {
    PURCHASE: {
        label: 'Purchase bill',
        prefix: 'PB',
        sourceType: StockSourceType.PURCHASE_BILL,
        /** Stock effect of one posted unit */
        sign: 1,
        forward: MovementType.PURCHASE_IN,
        reverse: MovementType.PURCHASE_REVERSAL,
    },
    SALES: {
        label: 'Sales bill',
        prefix: 'SB',
        sourceType: StockSourceType.SALES_BILL,
        sign: -1,
        forward: MovementType.SALE_OUT,
        reverse: MovementType.SALE_REVERSAL,
    },
} as const;

type PostedLine = {variantId: string; productId: string; quantity: number};

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Paid / part credit / credit from what is still owed */
export const paymentStatusOf = (amountPaid: number, balanceDue: number) =>
    balanceDue <= 0
        ? BillPaymentStatus.PAID
        : amountPaid > 0
          ? BillPaymentStatus.PART_CREDIT
          : BillPaymentStatus.CREDIT;

const BILL_INCLUDE = {
    createdBy: {select: {id: true, fullname: true}},
    shop: {select: {id: true, name: true, code: true, address: true, phone: true, gstin: true}},
} satisfies Prisma.PurchaseBillInclude;

/** Sales bills only: the staff member credited with the sale */
const SALESMAN = {select: {id: true, fullname: true}} as const;

const PAYMENT_ORDER = {orderBy: {paidAt: 'asc'}} as const;

const ITEM_INCLUDE = {
    variant: {
        select: {
            id: true,
            variantSku: true,
            size: true,
            color: true,
            colorHex: true,
            product: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    images: {where: {isMain: true}, take: 1, select: {url: true}},
                },
            },
        },
    },
} satisfies Prisma.PurchaseBillItemInclude;

class BillService {
    /** Bills live in the signed-in user's shop; the branch comes from the shop */
    public async shopContext(scope: ShopScope) {
        const shop = await prisma.shop.findFirst({
            where: {id: scope.shopId, companyId: scope.companyId, deletedAt: null},
            select: {id: true, branchId: true, companyId: true, code: true, billPrefix: true},
        });
        if (!shop)
            throw new ApiError(httpStatus.FORBIDDEN, 'No active shop is linked to this account');
        return shop;
    }

    /** Every variant must be active and belong to a product of this shop */
    private async loadVariants(tx: Tx, scope: ShopScope, variantIds: string[]) {
        const variants = await tx.productVariant.findMany({
            where: {
                id: {in: variantIds},
                isActive: true,
                product: {shopId: scope.shopId, companyId: scope.companyId, deletedAt: null},
            },
            select: {
                id: true,
                productId: true,
                variantSku: true,
                size: true,
                color: true,
                product: {select: {name: true, hsnCode: true, taxRate: true}},
            },
        });
        if (variants.length !== variantIds.length) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'One or more items are not active products of this shop',
            );
        }
        return new Map(variants.map((v) => [v.id, v]));
    }

    /**
     * Sales series prefix, e.g. "WW/26-27/". A GST invoice number may have at
     * most 16 characters, so a series starts with 2-4 letters (D-19):
     * PREFIX/26-27/00001. A shop whose series this year already uses a longer
     * prefix (a 5-6 letter one, or the shop code when none was set) keeps it
     * until the financial year ends; the next year starts with its first 4
     * letters.
     */
    public async salesSeriesPrefix(
        db: Tx | typeof prisma,
        shop: {id: string; code: string; billPrefix: string | null},
    ) {
        const fy = financialYear();
        const given = shop.billPrefix || shop.code;
        if (given.length <= 4) return `${given}/${fy}/`;
        const legacy = `${given}/${fy}/`;
        const used = await db.salesBill.count({
            where: {shopId: shop.id, billNumber: {startsWith: legacy}},
        });
        if (used) return legacy;
        const short = given.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 4);
        return `${short.length >= 2 ? short : 'SB'}/${fy}/`;
    }

    /** The next sales bill number of a shop, without taking it (shop lists, previews) */
    public async peekSalesBillNumber(shop: {id: string; code: string; billPrefix: string | null}) {
        return prisma.$transaction((tx) => this.nextBillNumber(tx, 'SALES', shop));
    }

    /** Purchase: PB-YYYYMMDD-0001. Sales: {bill prefix}/{FY}/00001, e.g. WW/26-27/00232 */
    private async nextBillNumber(
        tx: Tx,
        kind: Kind,
        shop: {id: string; code: string; billPrefix: string | null},
    ) {
        const shopId = shop.id;
        const day = dayKey().replace(/-/g, '');
        const prefix =
            kind === 'SALES'
                ? await this.salesSeriesPrefix(tx, shop)
                : `${KIND[kind].prefix}-${day}-`;
        return accountService.nextCode(tx, prefix, kind === 'SALES' ? 5 : 4, async (p) => {
            const rows =
                kind === 'PURCHASE'
                    ? await tx.purchaseBill.findMany({
                          where: {shopId, billNumber: {startsWith: p}},
                          select: {billNumber: true},
                      })
                    : await tx.salesBill.findMany({
                          where: {shopId, billNumber: {startsWith: p}},
                          select: {billNumber: true},
                      });
            return rows.map((r) => r.billNumber);
        });
    }

    private totalsCheck(subtotal: number, taxAmount: number, discount: number) {
        const gross = round2(subtotal + taxAmount);
        if (discount > gross) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'Discount cannot be more than the bill amount',
            );
        }
        return {
            subtotal: round2(subtotal),
            taxAmount: round2(taxAmount),
            discount,
            totalAmount: round2(gross - discount),
        };
    }

    /** Paid now vs owed; CREDIT with no amount means nothing was paid */
    private payment(totalAmount: number, data: {paymentMethod: string; paidAmount?: number}) {
        let paid = data.paidAmount ?? (data.paymentMethod === 'CREDIT' ? 0 : totalAmount);
        if (paid > totalAmount) {
            paid = totalAmount;
        }
        return {paidAmount: round2(paid), creditAmount: Math.max(0, round2(totalAmount - paid))};
    }

    /**
     * Payment fields for a bill: what is paid now plus any later payments
     * already on it must not exceed the total; the rest is credit.
     */
    private settle(
        kind: Kind,
        totalAmount: number,
        paidNow: Payment[],
        collected: number,
        party: {name?: string | null; phone?: string | null},
    ) {
        let amountPaid = round2(paidNow.reduce((sum, p) => sum + p.amount, 0) + collected);
        if (kind === 'SALES' && amountPaid > totalAmount) {
            amountPaid = totalAmount;
        } else if (kind === 'PURCHASE' && amountPaid > totalAmount) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'Amount paid is more than the bill amount',
            );
        }
        const balanceDue = Math.max(0, round2(totalAmount - amountPaid));
        if (kind === 'SALES' && balanceDue > 0 && (!party.name || !party.phone)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'Customer name and phone are required to give credit',
            );
        }
        return {amountPaid, balanceDue, paymentStatus: paymentStatusOf(amountPaid, balanceDue)};
    }

    /** Split payments, or the whole bill in paymentMethod when none are sent */

    /** Paid to the supplier now; omitted = paid in full */
    private purchasePaidNow(data: CreatePurchase | UpdatePurchase, totalAmount: number): Payment[] {
        const amount = data.amountPaid ?? totalAmount;
        return amount > 0 ? [{mode: data.paymentMode, amount}] : [];
    }

    /** Sum of payments recorded after the bill was saved (kept across edits) */
    private async collected(tx: Tx, kind: Kind, billId: string) {
        const where = {billId, atBilling: false};
        const agg =
            kind === 'SALES'
                ? await tx.salesBillPayment.aggregate({where, _sum: {amount: true}})
                : await tx.purchaseBillPayment.aggregate({where, _sum: {amount: true}});
        return agg._sum.amount ?? 0;
    }

    /** Credit notes point at bill lines, so a bill with returns is frozen */
    private async assertNoReturns(tx: Tx, id: string) {
        const [notes, legacy] = await Promise.all([
            tx.creditNote.count({
                where: {salesBillId: id, status: {not: CreditNoteStatus.REJECTED}},
            }),
            tx.salesReturn.count({where: {salesBillId: id}}),
        ]);
        if (notes + legacy) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'This bill has returns (credit notes) and can no longer be changed',
            );
        }
    }

    /** The salesman must be a live user of the shop's company */
    private async assertSalesman(tx: Tx, companyId: string, salesmanId: string) {
        const found = await tx.user.count({where: {id: salesmanId, companyId, deletedAt: null}});
        if (!found) throw new ApiError(httpStatus.BAD_REQUEST, 'Select a valid salesman');
    }

    /**
     * A shop customer with a credit limit (0 = no limit) cannot owe more than
     * it. `previous` is the due this bill already added for the same phone (edits).
     * Their due is ShopCustomer.balanceDue, the figure the Credit page shows.
     */
    private async assertCreditLimit(
        tx: Tx,
        shopId: string,
        phone: string | null | undefined,
        balanceDue: number,
        previous = 0,
    ) {
        const mobile = phone?.trim();
        // Only a new or bigger due is checked, so lowering one is always allowed
        if (!mobile || balanceDue <= previous) return;
        const customer = await tx.shopCustomer.findFirst({
            where: {shopId, mobile},
            select: {name: true, creditLimit: true, balanceDue: true},
        });
        if (!customer || customer.creditLimit <= 0) return;
        const owes = Math.max(0, round2(customer.balanceDue - previous));
        if (round2(owes + balanceDue) > customer.creditLimit) {
            const inr = (v: number) => `₹${v.toLocaleString('en-IN')}`;
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Credit limit ${inr(customer.creditLimit)} exceeded: ${customer.name} already owes ${inr(owes)}`,
            );
        }
    }

    private salesPaidNow(data: CreateSales | UpdateSales, totalAmount: number): Payment[] {
        if (data.payments && data.payments.length > 0) {
            let remaining = totalAmount;
            return data.payments
                .map((p) => {
                    const applied = Math.min(p.amount, remaining);
                    remaining = Math.max(0, round2(remaining - applied));
                    return {...p, amount: round2(applied)};
                })
                .filter((p) => p.amount > 0);
        }
        // CREDIT: only what was paid now (paidAmount, in cash) is a payment; the rest is due
        if (data.paymentMethod === 'CREDIT') {
            const paid = Math.min(round2(data.paidAmount ?? 0), totalAmount);
            return paid > 0 ? [{mode: 'CASH', amount: paid}] : [];
        }
        return [{mode: data.paymentMethod, amount: totalAmount}];
    }

    private async purchaseLines(tx: Tx, scope: ShopScope, data: CreatePurchase | UpdatePurchase) {
        const variants = await this.loadVariants(
            tx,
            scope,
            data.items.map((i) => i.variantId),
        );
        let subtotal = 0;
        let taxAmount = 0;
        const lines = data.items.map((item) => {
            const v = variants.get(item.variantId)!;
            const net = round2(item.quantity * item.unitCost);
            const tax = round2((net * item.taxRate) / 100);
            subtotal += net;
            taxAmount += tax;
            return {
                productId: v.productId,
                variantId: v.id,
                quantity: item.quantity,
                unitCost: item.unitCost,
                taxRate: item.taxRate,
                hsnCode: v.product.hsnCode,
                totalCost: round2(net + tax),
            };
        });
        return {lines, totals: this.totalsCheck(subtotal, taxAmount, data.discount)};
    }

    /**
     * Sales lines and totals.
     *
     * Tag-price bills (pricesIncludeTax, all new bills): the unit price already
     * contains GST, like the online store. The bill discount is shared over the
     * lines by value first, then GST is taken out of what the customer pays for
     * each line, and the total is rounded to the rupee (roundOff).
     *   line pays   = qty × price − item discount − its share of the bill discount
     *   taxable     = line pays ÷ (1 + rate)       GST = line pays − taxable
     *   total       = Σ line pays rounded to ₹1
     *
     * Older bills (GST added on top) keep their original maths so editing them
     * never changes what was charged.
     *
     * The GST rate of each line is the server's (D-18), never the one sent:
     * the product's fixed rate, or the shop's price rule on what one piece
     * sells for after the item and bill discounts. Lines of an older bill keep
     * the rate they were saved with (`keptRates`, by variant).
     */
    private async salesLines(
        tx: Tx,
        scope: ShopScope,
        data: Pick<CreateSales, 'items' | 'discount'>,
        inclusive = true,
        keptRates?: Map<string, number>,
    ) {
        const variants = await this.loadVariants(
            tx,
            scope,
            data.items.map((i) => i.variantId),
        );
        const rule = await shopGstService.ruleOf(scope.shopId, tx);
        const rateOf = (variantId: string, pieceValue: number, taxIncluded: boolean) => {
            const kept = keptRates?.get(variantId);
            if (kept !== undefined) return kept;
            return rateFor(rule, variants.get(variantId)!.product.taxRate, pieceValue, taxIncluded);
        };
        const nets = data.items.map((item) => {
            const v = variants.get(item.variantId)!;
            const gross = round2(item.quantity * item.unitPrice);
            if (item.discount > gross) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `Discount on "${v.product.name}" cannot be more than its amount`,
                );
            }
            return round2(gross - item.discount);
        });
        const describe = (item: (typeof data.items)[number], taxRate: number, totalPrice: number) => {
            const v = variants.get(item.variantId)!;
            return {
                productId: v.productId,
                variantId: v.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                taxRate,
                hsnCode: v.product.hsnCode,
                totalPrice,
                productName: v.product.name,
                variantSku: v.variantSku,
                size: v.size,
                color: v.color,
            };
        };

        if (!inclusive) {
            let subtotal = 0;
            let taxAmount = 0;
            const lines = data.items.map((item, i) => {
                const rate = rateOf(item.variantId, nets[i] / item.quantity, false);
                const tax = round2((nets[i] * rate) / 100);
                subtotal += nets[i];
                taxAmount += tax;
                return describe(item, rate, round2(nets[i] + tax));
            });
            return {lines, totals: {...this.totalsCheck(subtotal, taxAmount, data.discount), roundOff: 0, pricesIncludeTax: false}};
        }

        const itemsValue = round2(nets.reduce((t, n) => t + n, 0));
        const discount = round2(data.discount ?? 0);
        if (discount > itemsValue) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Discount cannot be more than the bill amount');
        }
        // Share the bill discount by line value; the last line takes the paise left over
        let shared = 0;
        let subtotal = 0;
        let taxAmount = 0;
        const lines = data.items.map((item, i) => {
            const share =
                i === data.items.length - 1
                    ? round2(discount - shared)
                    : itemsValue
                      ? round2((discount * nets[i]) / itemsValue)
                      : 0;
            shared = round2(shared + share);
            const pays = round2(nets[i] - share);
            const rate = rateOf(item.variantId, pays / item.quantity, true);
            const taxable = round2(pays / (1 + rate / 100));
            subtotal += taxable;
            taxAmount += round2(pays - taxable);
            return describe(item, rate, pays);
        });
        const exact = round2(lines.reduce((t, l) => t + l.totalPrice, 0));
        const totalAmount = Math.round(exact);
        return {
            lines,
            totals: {
                subtotal: round2(subtotal),
                taxAmount: round2(taxAmount),
                discount,
                roundOff: round2(totalAmount - exact),
                totalAmount,
                pricesIncludeTax: true,
            },
        };
    }

    /**
     * Post the stock difference between what the bill has already posted and
     * what it should post now. `posted` / `target` are empty when the bill
     * is (or becomes) a draft, cancelled or deleted.
     */
    private async post(
        tx: Tx,
        kind: Kind,
        bill: {id: string; billNumber: string; branchId: string},
        posted: PostedLine[],
        target: PostedLine[],
        action: string,
        actorId: string,
    ) {
        const k = KIND[kind];
        const net = new Map<string, {productId: string; qty: number}>();
        for (const l of posted) {
            const cur = net.get(l.variantId) ?? {productId: l.productId, qty: 0};
            net.set(l.variantId, {...cur, qty: cur.qty - l.quantity});
        }
        for (const l of target) {
            const cur = net.get(l.variantId) ?? {productId: l.productId, qty: 0};
            net.set(l.variantId, {...cur, qty: cur.qty + l.quantity});
        }

        const changes: StockChange[] = [...net.entries()]
            .filter(([, n]) => n.qty !== 0)
            .map(([variantId, n]) => ({
                variantId,
                productId: n.productId,
                delta: k.sign * n.qty,
                type: n.qty > 0 ? k.forward : k.reverse,
            }));

        try {
            await inventoryService.applyStockChanges(tx, {
                branchId: bill.branchId,
                changes,
                reason: `${k.label} ${bill.billNumber} ${action}`,
                reference: bill.billNumber,
                sourceType: k.sourceType,
                sourceId: bill.id,
                performedById: actorId,
            });
        } catch (error) {
            // e.g. a purchase cannot be reduced / cancelled once its units are sold
            if (error instanceof ApiError && kind === 'PURCHASE' && posted.length) {
                throw new ApiError(
                    error.statusCode,
                    `Stock from ${bill.billNumber} has already been sold. ${error.message}`,
                );
            }
            throw error;
        }
    }

    /**
     * Lock the bill row for this transaction and bump its version. Fails when
     * the bill is gone, in the wrong state, or (if given) the version the
     * client loaded is stale, so a double submit can never post twice.
     */
    private async lock(
        tx: Tx,
        kind: Kind,
        scope: ShopScope,
        id: string,
        allowed: BillStatus[],
        version?: number,
    ) {
        const where = {
            id,
            shopId: scope.shopId,
            deletedAt: null,
            status: {in: allowed},
            ...(version !== undefined ? {version} : {}),
        };
        const data = {version: {increment: 1}};
        const {count} =
            kind === 'PURCHASE'
                ? await tx.purchaseBill.updateMany({where, data})
                : await tx.salesBill.updateMany({where, data});
        if (count) return;

        const current =
            kind === 'PURCHASE'
                ? await tx.purchaseBill.findFirst({
                      where: {id, shopId: scope.shopId, deletedAt: null},
                  })
                : await tx.salesBill.findFirst({
                      where: {id, shopId: scope.shopId, deletedAt: null},
                  });
        if (!current) throw new ApiError(httpStatus.NOT_FOUND, `${KIND[kind].label} not found`);
        if (!allowed.includes(current.status)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `${KIND[kind].label} is ${current.status.toLowerCase()} and cannot be changed this way`,
            );
        }
        throw new ApiError(
            httpStatus.CONFLICT,
            `${KIND[kind].label} was changed by someone else. Reload it and try again.`,
        );
    }

    // -------------------------------------------------------------
    // PURCHASE BILLS (stock in)
    // -------------------------------------------------------------

    public listPurchase = (scope: ShopScope, query: BillList) =>
        this.list('PURCHASE', scope, query);

    public getPurchase = async (scope: ShopScope, id: string) => {
        const bill = await prisma.purchaseBill.findFirst({
            where: {id, shopId: scope.shopId, deletedAt: null},
            include: {...BILL_INCLUDE, items: {include: ITEM_INCLUDE}, payments: PAYMENT_ORDER},
        });
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase bill not found');
        return bill;
    };

    public createPurchase = async (scope: ShopScope, actorId: string, data: CreatePurchase) => {
        const shop = await this.shopContext(scope);
        const {items, status, amountPaid, paymentMode, ...header} = data;
        void items;
        void amountPaid;
        void paymentMode;

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const {lines, totals} = await this.purchaseLines(tx, scope, data);
                    const paidNow = this.purchasePaidNow(data, totals.totalAmount);
                    const bill = await tx.purchaseBill.create({
                        data: {
                            ...header,
                            ...totals,
                            ...this.settle('PURCHASE', totals.totalAmount, paidNow, 0, {}),
                            payments: {create: paidNow.map((p) => ({...p, paidById: actorId}))},
                            billNumber: await this.nextBillNumber(tx, 'PURCHASE', shop),
                            status,
                            companyId: shop.companyId,
                            branchId: shop.branchId,
                            shopId: shop.id,
                            createdById: actorId,
                            items: {create: lines},
                        },
                    });
                    if (status === BillStatus.CONFIRMED) {
                        await this.post(tx, 'PURCHASE', bill, [], lines, 'confirmed', actorId);
                    }
                    return bill;
                }),
            'billNumber',
        );
        return this.getPurchase(scope, created.id);
    };

    public updatePurchase = async (
        scope: ShopScope,
        actorId: string,
        id: string,
        data: UpdatePurchase,
    ) => {
        const {items, version, amountPaid, paymentMode, ...header} = data;
        void items;
        void amountPaid;
        void paymentMode;

        await prisma.$transaction(async (tx) => {
            await this.lock(
                tx,
                'PURCHASE',
                scope,
                id,
                [BillStatus.DRAFT, BillStatus.CONFIRMED],
                version,
            );
            const before = await tx.purchaseBill.findUniqueOrThrow({
                where: {id},
                include: {items: true},
            });
            const {lines, totals} = await this.purchaseLines(tx, scope, data);
            const paidNow = this.purchasePaidNow(data, totals.totalAmount);
            const later = await this.collected(tx, 'PURCHASE', id);

            await tx.purchaseBillItem.deleteMany({where: {billId: id}});
            await tx.purchaseBillPayment.deleteMany({where: {billId: id, atBilling: true}});
            await tx.purchaseBill.update({
                where: {id},
                data: {
                    ...header,
                    ...totals,
                    ...this.settle('PURCHASE', totals.totalAmount, paidNow, later, {}),
                    items: {create: lines},
                    payments: {create: paidNow.map((p) => ({...p, paidById: actorId}))},
                },
            });
            if (before.status === BillStatus.CONFIRMED) {
                await this.post(tx, 'PURCHASE', before, before.items, lines, 'edited', actorId);
            }
        });
        return this.getPurchase(scope, id);
    };

    public confirmPurchase = async (scope: ShopScope, actorId: string, id: string) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, 'PURCHASE', scope, id, [BillStatus.DRAFT]);
            const bill = await tx.purchaseBill.update({
                where: {id},
                data: {status: BillStatus.CONFIRMED},
                include: {items: true},
            });
            await this.post(tx, 'PURCHASE', bill, [], bill.items, 'confirmed', actorId);
        });
        return this.getPurchase(scope, id);
    };

    public cancelPurchase = async (
        scope: ShopScope,
        actorId: string,
        id: string,
        reason: string,
    ) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, 'PURCHASE', scope, id, [BillStatus.DRAFT, BillStatus.CONFIRMED]);
            const before = await tx.purchaseBill.findUniqueOrThrow({
                where: {id},
                include: {items: true},
            });
            await tx.purchaseBill.update({
                where: {id},
                data: {status: BillStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason},
            });
            if (before.status === BillStatus.CONFIRMED) {
                await this.post(
                    tx,
                    'PURCHASE',
                    before,
                    before.items,
                    [],
                    `cancelled: ${reason}`,
                    actorId,
                );
            }
        });
        return this.getPurchase(scope, id);
    };

    public deletePurchase = async (
        scope: ShopScope,
        actorId: string,
        id: string,
        onlyDraft = false,
    ) => {
        await prisma.$transaction(async (tx) => {
            const allowed = onlyDraft ? [BillStatus.DRAFT] : Object.values(BillStatus);
            await this.lock(tx, 'PURCHASE', scope, id, allowed);
            const before = await tx.purchaseBill.findUniqueOrThrow({
                where: {id},
                include: {items: true},
            });
            if (before.status === BillStatus.DRAFT) {
                await tx.purchaseBill.delete({where: {id}});
                return;
            }
            // Posted bills stay for the stock audit trail: reverse, then soft delete
            if (before.status === BillStatus.CONFIRMED) {
                await this.post(tx, 'PURCHASE', before, before.items, [], 'deleted', actorId);
            }
            await tx.purchaseBill.update({where: {id}, data: {deletedAt: new Date()}});
        });
    };

    // -------------------------------------------------------------
    // SALES BILLS (stock out)
    // -------------------------------------------------------------

    public getSalesByBillNumber = async (scope: ShopScope, billNumber: string) => {
        const bill = await prisma.salesBill.findFirst({
            where: {
                shopId: scope.shopId,
                billNumber: {equals: billNumber.trim(), mode: 'insensitive'},
                deletedAt: null,
            },
            include: {
                ...BILL_INCLUDE,
                salesman: SALESMAN,
                items: {include: {...ITEM_INCLUDE, returnItems: {select: {quantity: true}}}},
                payments: PAYMENT_ORDER,
                returns: {
                    select: {id: true, returnNumber: true, totalAmount: true, returnDate: true},
                    orderBy: {returnDate: 'asc'},
                },
            },
        });
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Bill not found');
        return {...bill, taxBreakup: await this.breakupOf(bill.shopId, bill, bill.items)};
    };

    public listSales = (scope: BillScope, query: BillList | BranchSalesList) =>
        this.list('SALES', scope, query);

    /**
     * The shop's GST state: its GSTIN's state code, else its branch's (or the
     * company's) state as typed, matched to a code.
     */
    private async sellerStateOf(shopId: string) {
        const shop = await prisma.shop.findUnique({
            where: {id: shopId},
            select: {gstin: true, branch: {select: {state: true}}, company: {select: {state: true}}},
        });
        const code =
            stateCodeOfGstin(shop?.gstin) ??
            stateCodeOfName(shop?.branch?.state) ??
            stateCodeOfName(shop?.company?.state);
        return {code, name: stateName(code)};
    }

    /**
     * GST per rate, split CGST + SGST or IGST by state code (P4-03). A B2B
     * bill's place of supply is the buyer's GSTIN state; a counter sale's is
     * the shop's own state.
     */
    private async breakupOf(
        shopId: string,
        bill: {billType?: SalesBillType | null; customerGstin?: string | null},
        items: {taxRate: number; totalPrice: number}[],
    ) {
        const seller = await this.sellerStateOf(shopId);
        const buyerCode =
            bill.billType === SalesBillType.TAX_INVOICE_B2B
                ? stateCodeOfGstin(bill.customerGstin)
                : null;
        const place = buyerCode ? {code: buyerCode, name: stateName(buyerCode)} : seller;
        return taxBreakup(items, seller, place);
    }

    /**
     * What a sales bill would come to, without saving it: the server's GST
     * rate per line, the totals and the GST breakup. The POS and the bill form
     * show these instead of doing their own GST maths.
     */
    public previewSales = async (scope: ShopScope, data: PreviewSales) => {
        const {lines, totals} = await prisma.$transaction((tx) => this.salesLines(tx, scope, data));
        const taxBreakupResult = await this.breakupOf(scope.shopId, data, lines);
        return {
            lines: lines.map((l) => {
                const taxable = round2(l.totalPrice / (1 + l.taxRate / 100));
                return {
                    variantId: l.variantId,
                    taxRate: l.taxRate,
                    hsnCode: l.hsnCode,
                    totalPrice: l.totalPrice,
                    taxable,
                    tax: round2(l.totalPrice - taxable),
                };
            }),
            totals,
            taxBreakup: taxBreakupResult,
        };
    };

    public getSales = async (scope: BillScope, id: string) => {
        const bill = await prisma.salesBill.findFirst({
            where: {id, ...scopeWhere(scope), deletedAt: null},
            include: {
                ...BILL_INCLUDE,
                salesman: SALESMAN,
                items: {include: {...ITEM_INCLUDE, returnItems: {select: {quantity: true}}}},
                payments: PAYMENT_ORDER,
                returns: {
                    select: {id: true, returnNumber: true, totalAmount: true, returnDate: true},
                    orderBy: {returnDate: 'asc'},
                },
            },
        });
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Sales bill not found');
        return {...bill, taxBreakup: await this.breakupOf(bill.shopId, bill, bill.items)};
    };

    /**
     * Day close locks the day's bills: once today's counter has been closed
     * (and not reopened) no new sales bill can be saved. Shops that do not
     * use the counter are not affected.
     */
    private assertDayOpen = async (shopId: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const latest = await prisma.counterSession.findFirst({
            where: {shopId, openedAt: {gte: today}},
            orderBy: {openedAt: 'desc'},
            select: {closedAt: true},
        });
        if (latest?.closedAt) {
            throw new ApiError(
                httpStatus.CONFLICT,
                "Today's cash book is closed. Open the counter again to make a new bill.",
            );
        }
    };

    public createSales = async (scope: ShopScope, actorId: string, data: CreateSales) => {
        const shop = await this.shopContext(scope);
        await this.assertDayOpen(shop.id);
        // creditDays only seeds a customer this bill creates; SalesBill has no column
        const {items, status, paidAmount, payments, creditDays, ...header} = data as any;
        void items;
        void paidAmount;
        void payments;

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const {lines, totals} = await this.salesLines(tx, scope, data);
                    const paidNow = this.salesPaidNow(data, totals.totalAmount);
                    const settled = this.settle('SALES', totals.totalAmount, paidNow, 0, {
                        name: data.customerName,
                        phone: data.customerPhone,
                    });
                    if (data.salesmanId) {
                        await this.assertSalesman(tx, shop.companyId, data.salesmanId);
                    }
                    // Drafts add nothing to the customer's due; confirmSales checks them later
                    if (status === BillStatus.CONFIRMED) {
                        await this.assertCreditLimit(
                            tx,
                            shop.id,
                            data.customerPhone,
                            settled.balanceDue,
                        );
                    }
                    const bill = await tx.salesBill.create({
                        data: {
                            ...header,
                            ...totals,
                            ...this.payment(totals.totalAmount, data as any),
                            ...settled,
                            billNumber: await this.nextBillNumber(tx, 'SALES', shop),
                            status,
                            companyId: shop.companyId,
                            branchId: shop.branchId,
                            shopId: shop.id,
                            createdById: actorId,
                            items: {create: lines},
                            // What was received at the counter (cash book and day close read these)
                            payments: {create: paidNow.map((p) => ({...p, receivedById: actorId}))},
                        },
                    });
                    if (status === BillStatus.CONFIRMED) {
                        await this.post(tx, 'SALES', bill, [], lines, 'confirmed', actorId);
                    }
                    await syncCustomerFromBill(tx, null, {...bill, creditDays});
                    return bill;
                }),
            'billNumber',
        );
        return this.getSales(scope, created.id);
    };

    /**
     * The replacement bill for an exchange, inside the credit note's
     * transaction. Items are checked and priced like any sale; the credit
     * note's value is recorded as a CREDIT_NOTE payment (not cash) and the
     * customer pays any difference by `topUpMode`.
     */
    public createExchangeBill = async (
        tx: Tx,
        scope: ShopScope,
        actorId: string,
        data: {
            customerName: string | null;
            customerPhone: string | null;
            noteNumber: string;
            creditValue: number;
            topUpMode: 'CASH' | 'UPI' | 'CARD';
            /** GST is worked out by salesLines (D-18) */
            items: {variantId: string; quantity: number; unitPrice: number}[];
        },
    ) => {
        const shop = await this.shopContext(scope);
        const {lines, totals} = await this.salesLines(tx, scope, {
            items: data.items.map(({variantId, quantity, unitPrice}) => ({
                variantId,
                quantity,
                unitPrice,
                discount: 0,
            })),
            discount: 0,
        });
        if (totals.totalAmount < data.creditValue) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Exchange items (₹${totals.totalAmount}) are worth less than the return (₹${data.creditValue}). Add items, or settle as a refund or store credit.`,
            );
        }
        const topUp = round2(totals.totalAmount - data.creditValue);
        const bill = await tx.salesBill.create({
            data: {
                ...totals,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                paymentMethod: topUp > 0 ? data.topUpMode : 'CASH',
                amountPaid: totals.totalAmount,
                balanceDue: 0,
                paymentStatus: BillPaymentStatus.PAID,
                notes: `Exchange against credit note ${data.noteNumber}`,
                billNumber: await this.nextBillNumber(tx, 'SALES', shop),
                status: BillStatus.CONFIRMED,
                companyId: shop.companyId,
                branchId: shop.branchId,
                shopId: shop.id,
                createdById: actorId,
                items: {create: lines},
                payments: {
                    create: [
                        {
                            mode: 'CREDIT_NOTE',
                            amount: data.creditValue,
                            note: `Credit note ${data.noteNumber}`,
                            receivedById: actorId,
                        },
                        ...(topUp > 0
                            ? [{mode: data.topUpMode, amount: topUp, receivedById: actorId}]
                            : []),
                    ],
                },
            },
        });
        await this.post(tx, 'SALES', bill, [], lines, 'exchange', actorId);
        await syncCustomerFromBill(tx, null, bill);
        return bill;
    };

    public updateSales = async (
        scope: ShopScope,
        actorId: string,
        id: string,
        data: UpdateSales,
    ) => {
        const {items, version, paidAmount, payments, creditDays, ...header} = data as any;
        void items;
        void paidAmount;
        void payments;

        await prisma.$transaction(async (tx) => {
            await this.lock(
                tx,
                'SALES',
                scope,
                id,
                [BillStatus.DRAFT, BillStatus.CONFIRMED],
                version,
            );
            const before = await tx.salesBill.findUniqueOrThrow({
                where: {id},
                include: {items: true},
            });
            await this.assertNoReturns(tx, id);
            // Older bills (GST on top) keep each item's saved rate, so an edit never re-taxes them
            const kept = before.pricesIncludeTax
                ? undefined
                : new Map(before.items.map((i) => [i.variantId, i.taxRate]));
            const {lines, totals} = await this.salesLines(
                tx,
                scope,
                data,
                before.pricesIncludeTax,
                kept,
            );
            const paidNow = this.salesPaidNow(data, totals.totalAmount);
            const later = await this.collected(tx, 'SALES', id);
            const settled = this.settle('SALES', totals.totalAmount, paidNow, later, {
                name: data.customerName,
                phone: data.customerPhone,
            });
            if (data.salesmanId && data.salesmanId !== before.salesmanId) {
                await this.assertSalesman(tx, scope.companyId, data.salesmanId);
            }
            if (before.status === BillStatus.CONFIRMED) {
                const samePhone = before.customerPhone?.trim() === data.customerPhone?.trim();
                await this.assertCreditLimit(
                    tx,
                    before.shopId,
                    data.customerPhone,
                    settled.balanceDue,
                    samePhone ? before.balanceDue : 0,
                );
            }
            // Edits resend the whole bill, so a missing GSTIN / salesman is cleared;
            // without billType (older bill forms) all three are left as they were
            if (data.billType) {
                header.customerGstin = data.customerGstin ?? null;
                header.salesmanId = data.salesmanId ?? null;
            } else {
                delete header.billType;
                delete header.customerGstin;
                delete header.salesmanId;
            }

            await tx.salesBillItem.deleteMany({where: {billId: id}});
            await tx.salesBillPayment.deleteMany({where: {billId: id, atBilling: true}});
            const after = await tx.salesBill.update({
                where: {id},
                data: {
                    ...header,
                    ...totals,
                    ...this.payment(totals.totalAmount, data as any),
                    ...settled,
                    // Edits after confirming are tracked for the branch watch list
                    ...(before.status === BillStatus.CONFIRMED
                        ? {editCount: {increment: 1}, lastEditedAt: new Date()}
                        : {}),
                    items: {create: lines},
                    // The counter payments were removed above; save the edited ones
                    payments: {create: paidNow.map((p) => ({...p, receivedById: actorId}))},
                },
            });
            if (before.status === BillStatus.CONFIRMED) {
                await this.post(tx, 'SALES', before, before.items, lines, 'edited', actorId);
            }
            await syncCustomerFromBill(tx, before, {...after, creditDays});
        });
        return this.getSales(scope, id);
    };

    public confirmSales = async (scope: ShopScope, actorId: string, id: string) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, 'SALES', scope, id, [BillStatus.DRAFT]);
            const bill = await tx.salesBill.update({
                where: {id},
                data: {status: BillStatus.CONFIRMED},
                include: {items: true},
            });
            await this.assertCreditLimit(tx, bill.shopId, bill.customerPhone, bill.balanceDue);
            await this.post(tx, 'SALES', bill, [], bill.items, 'confirmed', actorId);
            await syncCustomerFromBill(tx, null, bill);
        });
        return this.getSales(scope, id);
    };

    public cancelSales = async (scope: ShopScope, actorId: string, id: string, reason: string) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, 'SALES', scope, id, [BillStatus.DRAFT, BillStatus.CONFIRMED]);
            await this.assertNoReturns(tx, id);
            const before = await tx.salesBill.findUniqueOrThrow({
                where: {id},
                include: {items: true},
            });
            const after = await tx.salesBill.update({
                where: {id},
                data: {status: BillStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason},
            });
            await syncCustomerFromBill(tx, before, after);
            if (before.status === BillStatus.CONFIRMED) {
                await this.post(
                    tx,
                    'SALES',
                    before,
                    before.items,
                    [],
                    `cancelled: ${reason}`,
                    actorId,
                );
            }
        });
        return this.getSales(scope, id);
    };

    public deleteSales = async (
        scope: ShopScope,
        actorId: string,
        id: string,
        onlyDraft = false,
    ) => {
        await prisma.$transaction(async (tx) => {
            const allowed = onlyDraft ? [BillStatus.DRAFT] : Object.values(BillStatus);
            await this.lock(tx, 'SALES', scope, id, allowed);
            await this.assertNoReturns(tx, id);
            const before = await tx.salesBill.findUniqueOrThrow({
                where: {id},
                include: {items: true},
            });
            if (before.status === BillStatus.DRAFT) {
                await tx.salesBill.delete({where: {id}});
                return;
            }
            if (before.status === BillStatus.CONFIRMED) {
                await this.post(tx, 'SALES', before, before.items, [], 'deleted', actorId);
            }
            await tx.salesBill.update({where: {id}, data: {deletedAt: new Date()}});
            await syncCustomerFromBill(tx, before, null);
        });
    };

    // -------------------------------------------------------------
    // DELETE REQUESTS (D-16): an employee may delete drafts only; for a
    // posted bill they ask, and the shop admin or owner deletes it or keeps it
    // -------------------------------------------------------------

    /** Status of a bill of this shop, to choose between delete and request */
    public statusOf = async (kind: Kind, scope: ShopScope, id: string) => {
        const where = {id, shopId: scope.shopId, deletedAt: null};
        const select = {status: true};
        const bill =
            kind === 'PURCHASE'
                ? await prisma.purchaseBill.findFirst({where, select})
                : await prisma.salesBill.findFirst({where, select});
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, `${KIND[kind].label} not found`);
        return bill.status;
    };

    public requestDelete = async (
        kind: Kind,
        scope: ShopScope,
        actorId: string,
        id: string,
        reason: string,
    ) => {
        const where = {
            id,
            shopId: scope.shopId,
            deletedAt: null,
            status: {in: [BillStatus.CONFIRMED, BillStatus.CANCELLED]},
            deleteRequestedAt: null,
        };
        const data = {
            deleteRequestedAt: new Date(),
            deleteRequestedById: actorId,
            deleteRequestReason: reason,
        };
        const {count} =
            kind === 'PURCHASE'
                ? await prisma.purchaseBill.updateMany({where, data})
                : await prisma.salesBill.updateMany({where, data});
        if (!count) {
            throw new ApiError(
                httpStatus.CONFLICT,
                'This bill is already waiting for approval, or it has changed. Reload and try again.',
            );
        }
    };

    /** Turn down an employee's delete request: the bill stays as it is */
    public keepBill = async (kind: Kind, scope: ShopScope, id: string) => {
        const where = {id, shopId: scope.shopId, deletedAt: null, deleteRequestedAt: {not: null}};
        const data = {
            deleteRequestedAt: null,
            deleteRequestedById: null,
            deleteRequestReason: null,
        };
        const {count} =
            kind === 'PURCHASE'
                ? await prisma.purchaseBill.updateMany({where, data})
                : await prisma.salesBill.updateMany({where, data});
        if (!count) throw new ApiError(httpStatus.NOT_FOUND, 'No one asked to delete this bill');
    };

    // -------------------------------------------------------------
    // PAYMENTS AFTER BILLING (due collection / supplier payment)
    // -------------------------------------------------------------

    public recordPayment = async (
        kind: Kind,
        scope: ShopScope,
        actorId: string,
        id: string,
        data: RecordPayment,
    ) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, kind, scope, id, [BillStatus.CONFIRMED]);
            const bill =
                kind === 'SALES'
                    ? await tx.salesBill.findUniqueOrThrow({where: {id}})
                    : await tx.purchaseBill.findUniqueOrThrow({where: {id}});
            if (data.amount > bill.balanceDue) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    bill.balanceDue > 0
                        ? `Amount cannot be more than the balance due (₹${bill.balanceDue})`
                        : 'Nothing is due on this bill',
                );
            }
            const amountPaid = round2(bill.amountPaid + data.amount);
            const balanceDue = round2(bill.balanceDue - data.amount);
            const fields = {
                amountPaid,
                balanceDue,
                paymentStatus: paymentStatusOf(amountPaid, balanceDue),
            };
            const payment = {
                mode: data.mode,
                amount: data.amount,
                note: data.note,
                atBilling: false,
            };
            if (kind === 'SALES') {
                const after = await tx.salesBill.update({
                    where: {id},
                    data: {...fields, payments: {create: {...payment, receivedById: actorId}}},
                });
                await syncCustomerFromBill(tx, bill as typeof after, after);
            } else {
                await tx.purchaseBill.update({
                    where: {id},
                    data: {...fields, payments: {create: {...payment, paidById: actorId}}},
                });
            }
        });
        return kind === 'SALES' ? this.getSales(scope, id) : this.getPurchase(scope, id);
    };

    // -------------------------------------------------------------
    // LISTING
    // -------------------------------------------------------------

    /** Filters shared by the sales list and the Excel export */
    private salesWhere(
        scope: BillScope,
        query: BillList | BranchSalesList,
    ): Prisma.SalesBillWhereInput {
        const branch = query as Partial<BranchSalesList>;
        return {
            ...scopeWhere(scope),
            deletedAt: null,
            status: query.status,
            ...dateRange(query.from, query.to),
            ...(query.deleteRequested ? {deleteRequestedAt: {not: null}} : {}),
            ...(!scope.shopId && branch.shopId ? {shopId: branch.shopId} : {}),
            ...(branch.paymentMethod ? {paymentMethod: branch.paymentMethod} : {}),
            ...(branch.flag === 'EDITED' ? {editCount: {gt: 0}} : {}),
            ...(branch.flag === 'ON_CREDIT'
                ? {creditAmount: {gt: 0}, status: {not: BillStatus.CANCELLED}}
                : {}),
            ...(query.search
                ? {
                      OR: [
                          {billNumber: {contains: query.search, mode: 'insensitive'}},
                          {customerName: {contains: query.search, mode: 'insensitive'}},
                          {customerPhone: {contains: query.search, mode: 'insensitive'}},
                          {items: itemSearchOf(query.search)},
                      ],
                  }
                : {}),
        };
    }

    /**
     * Every matching bill for the Excel export. Over the cap the export is
     * refused with a clear message (P4-11), never cut short without saying so.
     */
    public exportSales = async (scope: BillScope, query: BranchSalesList) => {
        const where = this.salesWhere(scope, query);
        const total = await prisma.salesBill.count({where});
        if (total > EXPORT_CAP) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `${total.toLocaleString('en-IN')} bills match; an export can have at most ${EXPORT_CAP.toLocaleString('en-IN')}. Pick a shorter date range or one shop.`,
            );
        }
        return prisma.salesBill.findMany({
            where,
            include: BILL_INCLUDE,
            orderBy: {billDate: 'desc'},
        });
    };

    /**
     * Branch sales summary for a date range (default: today): KPIs, bills
     * per shop, per-cashier totals and the watch list.
     */
    public salesSummary = async (scope: BillScope, query: BranchSalesSummary) => {
        const from = query.from ?? startOfToday();
        const to = query.to ?? from;
        const range = {...scopeWhere(scope), deletedAt: null, ...dateRange(from, to)};
        const where = query.shopId ? {...range, shopId: query.shopId} : range;

        const [shops, perShop, bills] = await Promise.all([
            prisma.shop.findMany({
                where: {...scopeWhere(scope), deletedAt: null},
                select: {id: true, name: true},
                orderBy: {name: 'asc'},
            }),
            prisma.salesBill.groupBy({by: ['shopId'], where: range, _count: {_all: true}}),
            prisma.salesBill.findMany({
                where,
                select: {
                    status: true,
                    totalAmount: true,
                    taxAmount: true,
                    discount: true,
                    creditAmount: true,
                    editCount: true,
                    customerPhone: true,
                    createdById: true,
                    createdBy: {select: {fullname: true}},
                    shop: {select: {name: true}},
                    items: {select: {discount: true}},
                },
            }),
        ]);

        type Row = (typeof bills)[number];
        /** Bill discount plus every line discount */
        const discountOf = (b: Row) => b.discount + b.items.reduce((t, i) => t + i.discount, 0);
        const live = bills.filter((b) => b.status === BillStatus.CONFIRMED);
        const netSales = live.reduce((t, b) => t + b.totalAmount, 0);
        const discount = live.reduce((t, b) => t + discountOf(b), 0);
        const onCredit = live.filter((b) => b.creditAmount > 0);
        const cancelled = bills.filter((b) => b.status === BillStatus.CANCELLED).length;
        const edited = bills.filter((b) => b.editCount > 0).length;

        type Cashier = {
            id: string;
            name: string;
            shop: string;
            bills: number;
            sales: number;
            discount: number;
            edits: number;
            cancels: number;
        };
        const cashiers = new Map<string, Cashier>();
        bills.forEach((b) => {
            const row = cashiers.get(b.createdById) ?? {
                id: b.createdById,
                name: b.createdBy.fullname,
                shop: b.shop.name,
                bills: 0,
                sales: 0,
                discount: 0,
                edits: 0,
                cancels: 0,
            };
            row.bills += 1;
            if (b.status === BillStatus.CONFIRMED) {
                row.sales += b.totalAmount;
                row.discount += discountOf(b);
            }
            if (b.editCount > 0) row.edits += 1;
            if (b.status === BillStatus.CANCELLED) row.cancels += 1;
            cashiers.set(b.createdById, row);
        });

        const {discountApprovalPct} = await companySettingsService.get(scope.companyId);
        return {
            range: {from, to},
            /** The company's discount level for the watch list (P4-08) */
            discountApprovalPct,
            kpis: {
                bills: bills.length,
                creditBills: onCredit.length,
                cancelled,
                netSales: round2(netSales),
                taxAmount: round2(live.reduce((t, b) => t + b.taxAmount, 0)),
                discount: round2(discount),
                discountPct:
                    netSales + discount ? round2((discount / (netSales + discount)) * 100) : 0,
                onCredit: round2(onCredit.reduce((t, b) => t + b.creditAmount, 0)),
                edited,
            },
            shopCounts: shops.map((sh) => ({
                shopId: sh.id,
                name: sh.name,
                bills: perShop.find((p) => p.shopId === sh.id)?._count._all ?? 0,
            })),
            cashiers: [...cashiers.values()]
                .map((c) => ({...c, sales: round2(c.sales), discount: round2(c.discount)}))
                .sort((a, b) => b.sales - a.sales),
            watch: {
                /** Discount above the company's % of the amount before discount */
                highDiscount: live.filter(
                    (b) =>
                        discountOf(b) > (discountApprovalPct / 100) * (b.totalAmount + discountOf(b)),
                ).length,
                edited,
                cancelled,
                noMobile: bills.filter((b) => !b.customerPhone).length,
            },
        };
    };

    /**
     * POS customer lookup: this shop's saved customers first (due as the Credit
     * page shows it), then past bill customers not saved yet. At most 10.
     */
    public searchCustomers = async (scope: ShopScope, q: string) => {
        const term = q.trim();
        const saved = await prisma.shopCustomer.findMany({
            where: {
                shopId: scope.shopId,
                isActive: true,
                ...(term
                    ? {
                          OR: [
                              {name: {contains: term, mode: 'insensitive'}},
                              {businessName: {contains: term, mode: 'insensitive'}},
                              {mobile: {contains: term}},
                          ],
                      }
                    : {}),
            },
            select: {
                name: true,
                mobile: true,
                balanceDue: true,
                creditLimit: true,
                creditDays: true,
                gstin: true,
                businessName: true,
            },
            orderBy: {updatedAt: 'desc'},
            take: 10,
        });
        const result = saved.map((c) => ({
            name: c.name,
            phone: c.mobile,
            previousDue: round2(c.balanceDue),
            creditLimit: c.creditLimit,
            creditDays: c.creditDays,
            gstin: c.gstin,
            businessName: c.businessName,
        }));
        if (result.length >= 10) return result;

        const rows = await prisma.salesBill.findMany({
            where: {
                shopId: scope.shopId,
                deletedAt: null,
                status: 'CONFIRMED',
                customerPhone: {not: null, notIn: saved.map((c) => c.mobile)},
                ...(term
                    ? {
                          OR: [
                              {customerName: {contains: term, mode: 'insensitive'}},
                              {customerPhone: {contains: term}},
                          ],
                      }
                    : {}),
            },
            select: {customerName: true, customerPhone: true, balanceDue: true},
            orderBy: {billDate: 'desc'},
            take: 20,
        });

        // Deduplicate by phone, adding up the balance due
        const seen = new Map<string, {name: string; due: number}>();
        for (const r of rows) {
            const c = seen.get(r.customerPhone!);
            if (c) c.due = round2(c.due + r.balanceDue);
            else seen.set(r.customerPhone!, {name: r.customerName ?? '', due: r.balanceDue});
        }
        // Not saved as a customer yet: the company's default credit days (P4-08)
        const {defaultCreditDays} = await companySettingsService.get(scope.companyId);
        for (const [phone, c] of seen) {
            if (result.length >= 10) break;
            result.push({
                name: c.name,
                phone,
                previousDue: round2(c.due),
                creditLimit: 0,
                creditDays: defaultCreditDays,
                gstin: null,
                businessName: null,
            });
        }
        return result;
    };

    private async list(kind: Kind, scope: BillScope, query: BillList | BranchSalesList) {
        const base = {
            ...scopeWhere(scope),
            deletedAt: null,
            status: query.status,
            ...(query.paymentStatus
                ? {
                      paymentStatus:
                          query.paymentStatus === 'DUE'
                              ? {in: [BillPaymentStatus.PART_CREDIT, BillPaymentStatus.CREDIT]}
                              : query.paymentStatus,
                  }
                : {}),
            ...(query.deleteRequested ? {deleteRequestedAt: {not: null}} : {}),
            ...(query.from || query.to
                ? {
                      billDate: {
                          ...(query.from ? {gte: query.from} : {}),
                          ...(query.to ? {lte: endOfDay(query.to)} : {}),
                      },
                  }
                : {}),
        };
        const itemSearch = itemSearchOf(query.search);
        const args = listArgs(query);
        const include = {...BILL_INCLUDE, _count: {select: {items: true}}};

        if (kind === 'PURCHASE') {
            const where: Prisma.PurchaseBillWhereInput = {
                ...base,
                ...(query.search
                    ? {
                          OR: [
                              {billNumber: {contains: query.search, mode: 'insensitive'}},
                              {supplierName: {contains: query.search, mode: 'insensitive'}},
                              {supplierInvoiceNo: {contains: query.search, mode: 'insensitive'}},
                              {items: itemSearch},
                          ],
                      }
                    : {}),
            };
            const [items, total] = await prisma.$transaction([
                prisma.purchaseBill.findMany({where, ...args, include}),
                prisma.purchaseBill.count({where}),
            ]);
            return toListResult(items, total, query);
        }

        const where = this.salesWhere(scope, query);
        const [items, total] = await prisma.$transaction([
            prisma.salesBill.findMany({where, ...args, include}),
            prisma.salesBill.count({where}),
        ]);
        return toListResult(items, total, query);
    }
}

const itemSearchOf = (search: string) => ({
    some: {
        variant: {
            OR: [
                {variantSku: {contains: search, mode: 'insensitive' as const}},
                {product: {name: {contains: search, mode: 'insensitive' as const}}},
            ],
        },
    },
});

const dateRange = (from?: Date, to?: Date) =>
    from || to
        ? {
              billDate: {
                  ...(from ? {gte: from} : {}),
                  ...(to ? {lte: endOfDay(to)} : {}),
              },
          }
        : {};

const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (d: Date) => {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
};

    // -------------------------------------------------------------
    // CUSTOMER LOOKUP
    // -------------------------------------------------------------

export default new BillService();

