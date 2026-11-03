import httpStatus from 'http-status';
import {BillStatus, MovementType, Prisma, StockSourceType} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {listArgs, toListResult} from '../utils/list';
import {billValidation} from '@validations/index';
import accountService from './account.service';
import inventoryService, {StockChange} from './inventory.service';
import {ShopScope} from './shopProduct.service';

type Tx = Prisma.TransactionClient;
type CreatePurchase = z.infer<typeof billValidation.createPurchaseBillSchema>;
type UpdatePurchase = z.infer<typeof billValidation.updatePurchaseBillSchema>;
type CreateSales = z.infer<typeof billValidation.createSalesBillSchema>;
type UpdateSales = z.infer<typeof billValidation.updateSalesBillSchema>;
type BillList = z.infer<typeof billValidation.billListSchema>;

/*
 * Shop billing. Inventory is never changed directly here: every stock effect
 * is the difference between what a bill has already posted and what it
 * should post now, applied through inventoryService.applyStockChanges in the
 * same transaction as the bill write. Re-saving an unchanged bill therefore
 * posts nothing, and a failed stock check rolls the whole bill back.
 */

type Kind = 'PURCHASE' | 'SALES';

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

const BILL_INCLUDE = {
    createdBy: {select: {id: true, fullname: true}},
} satisfies Prisma.PurchaseBillInclude;

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
    private async shopContext(scope: ShopScope) {
        const shop = await prisma.shop.findFirst({
            where: {id: scope.shopId, companyId: scope.companyId, deletedAt: null},
            select: {id: true, branchId: true, companyId: true},
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
                product: {select: {name: true}},
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

    private async nextBillNumber(tx: Tx, kind: Kind, shopId: string) {
        const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `${KIND[kind].prefix}-${day}-`;
        return accountService.nextCode(tx, prefix, 4, async (p) => {
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
                totalCost: round2(net + tax),
            };
        });
        return {lines, totals: this.totalsCheck(subtotal, taxAmount, data.discount)};
    }

    private async salesLines(tx: Tx, scope: ShopScope, data: CreateSales | UpdateSales) {
        const variants = await this.loadVariants(
            tx,
            scope,
            data.items.map((i) => i.variantId),
        );
        let subtotal = 0;
        let taxAmount = 0;
        const lines = data.items.map((item) => {
            const v = variants.get(item.variantId)!;
            const gross = round2(item.quantity * item.unitPrice);
            if (item.discount > gross) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `Discount on "${v.product.name}" cannot be more than its amount`,
                );
            }
            const net = round2(gross - item.discount);
            const tax = round2((net * item.taxRate) / 100);
            subtotal += net;
            taxAmount += tax;
            return {
                productId: v.productId,
                variantId: v.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                taxRate: item.taxRate,
                totalPrice: round2(net + tax),
                productName: v.product.name,
                variantSku: v.variantSku,
                size: v.size,
                color: v.color,
            };
        });
        return {lines, totals: this.totalsCheck(subtotal, taxAmount, data.discount)};
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
            include: {...BILL_INCLUDE, items: {include: ITEM_INCLUDE}},
        });
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase bill not found');
        return bill;
    };

    public createPurchase = async (scope: ShopScope, actorId: string, data: CreatePurchase) => {
        const shop = await this.shopContext(scope);
        const {items, status, ...header} = data;
        void items;

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const {lines, totals} = await this.purchaseLines(tx, scope, data);
                    const bill = await tx.purchaseBill.create({
                        data: {
                            ...header,
                            ...totals,
                            billNumber: await this.nextBillNumber(tx, 'PURCHASE', shop.id),
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
        const {items, version, ...header} = data;
        void items;

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

            await tx.purchaseBillItem.deleteMany({where: {billId: id}});
            await tx.purchaseBill.update({
                where: {id},
                data: {...header, ...totals, items: {create: lines}},
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

    public deletePurchase = async (scope: ShopScope, actorId: string, id: string) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, 'PURCHASE', scope, id, Object.values(BillStatus));
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

    public listSales = (scope: ShopScope, query: BillList) => this.list('SALES', scope, query);

    public getSales = async (scope: ShopScope, id: string) => {
        const bill = await prisma.salesBill.findFirst({
            where: {id, shopId: scope.shopId, deletedAt: null},
            include: {...BILL_INCLUDE, items: {include: ITEM_INCLUDE}},
        });
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Sales bill not found');
        return bill;
    };

    public createSales = async (scope: ShopScope, actorId: string, data: CreateSales) => {
        const shop = await this.shopContext(scope);
        const {items, status, ...header} = data;
        void items;

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const {lines, totals} = await this.salesLines(tx, scope, data);
                    const bill = await tx.salesBill.create({
                        data: {
                            ...header,
                            ...totals,
                            billNumber: await this.nextBillNumber(tx, 'SALES', shop.id),
                            status,
                            companyId: shop.companyId,
                            branchId: shop.branchId,
                            shopId: shop.id,
                            createdById: actorId,
                            items: {create: lines},
                        },
                    });
                    if (status === BillStatus.CONFIRMED) {
                        await this.post(tx, 'SALES', bill, [], lines, 'confirmed', actorId);
                    }
                    return bill;
                }),
            'billNumber',
        );
        return this.getSales(scope, created.id);
    };

    public updateSales = async (
        scope: ShopScope,
        actorId: string,
        id: string,
        data: UpdateSales,
    ) => {
        const {items, version, ...header} = data;
        void items;

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
            const {lines, totals} = await this.salesLines(tx, scope, data);

            await tx.salesBillItem.deleteMany({where: {billId: id}});
            await tx.salesBill.update({
                where: {id},
                data: {...header, ...totals, items: {create: lines}},
            });
            if (before.status === BillStatus.CONFIRMED) {
                await this.post(tx, 'SALES', before, before.items, lines, 'edited', actorId);
            }
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
            await this.post(tx, 'SALES', bill, [], bill.items, 'confirmed', actorId);
        });
        return this.getSales(scope, id);
    };

    public cancelSales = async (scope: ShopScope, actorId: string, id: string, reason: string) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, 'SALES', scope, id, [BillStatus.DRAFT, BillStatus.CONFIRMED]);
            const before = await tx.salesBill.findUniqueOrThrow({
                where: {id},
                include: {items: true},
            });
            await tx.salesBill.update({
                where: {id},
                data: {status: BillStatus.CANCELLED, cancelledAt: new Date(), cancelReason: reason},
            });
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

    public deleteSales = async (scope: ShopScope, actorId: string, id: string) => {
        await prisma.$transaction(async (tx) => {
            await this.lock(tx, 'SALES', scope, id, Object.values(BillStatus));
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
        });
    };

    // -------------------------------------------------------------
    // LISTING
    // -------------------------------------------------------------

    private async list(kind: Kind, scope: ShopScope, query: BillList) {
        const base = {
            shopId: scope.shopId,
            deletedAt: null,
            status: query.status,
            ...(query.from || query.to
                ? {
                      billDate: {
                          ...(query.from ? {gte: query.from} : {}),
                          ...(query.to ? {lte: endOfDay(query.to)} : {}),
                      },
                  }
                : {}),
        };
        const itemSearch = {
            some: {
                variant: {
                    OR: [
                        {variantSku: {contains: query.search, mode: 'insensitive' as const}},
                        {product: {name: {contains: query.search, mode: 'insensitive' as const}}},
                    ],
                },
            },
        };
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

        const where: Prisma.SalesBillWhereInput = {
            ...base,
            ...(query.search
                ? {
                      OR: [
                          {billNumber: {contains: query.search, mode: 'insensitive'}},
                          {customerName: {contains: query.search, mode: 'insensitive'}},
                          {customerPhone: {contains: query.search, mode: 'insensitive'}},
                          {items: itemSearch},
                      ],
                  }
                : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.salesBill.findMany({where, ...args, include}),
            prisma.salesBill.count({where}),
        ]);
        return toListResult(items, total, query);
    }
}

const endOfDay = (d: Date) => {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
};

export default new BillService();
