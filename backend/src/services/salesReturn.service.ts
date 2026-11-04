import httpStatus from 'http-status';
import {BillStatus, MovementType, Prisma, StockSourceType} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {listArgs, toListResult} from '../utils/list';
import {shopOpsValidation} from '@validations/index';
import accountService from './account.service';
import billService, {financialYear, paymentStatusOf} from './bill.service';
import inventoryService from './inventory.service';
import {ShopScope} from './shopProduct.service';

type CreateReturn = z.infer<typeof shopOpsValidation.createSalesReturnSchema>;
type ReturnList = z.infer<typeof shopOpsValidation.returnListSchema>;

const round2 = (v: number) => Math.round(v * 100) / 100;

const RETURN_INCLUDE = {
    createdBy: {select: {id: true, fullname: true}},
    salesBill: {select: {id: true, billNumber: true}},
    items: {
        include: {
            salesBillItem: {
                select: {productName: true, variantSku: true, size: true, color: true},
            },
        },
    },
} satisfies Prisma.SalesReturnInclude;

/*
 * Sales returns (credit notes, CN/26-27/0001). Returned units go back into
 * stock through inventoryService.applyStockChanges in the same transaction.
 * The refund is the returned lines' share of what the customer was billed,
 * so line and bill discounts are honoured.
 */
class SalesReturnService {
    private async nextReturnNumber(tx: Prisma.TransactionClient, shopId: string) {
        const prefix = `CN/${financialYear()}/`;
        return accountService.nextCode(tx, prefix, 4, async (p) => {
            const rows = await tx.salesReturn.findMany({
                where: {shopId, returnNumber: {startsWith: p}},
                select: {returnNumber: true},
            });
            return rows.map((r) => r.returnNumber);
        });
    }

    public get = async (scope: ShopScope, id: string) => {
        const row = await prisma.salesReturn.findFirst({
            where: {id, shopId: scope.shopId},
            include: RETURN_INCLUDE,
        });
        if (!row) throw new ApiError(httpStatus.NOT_FOUND, 'Credit note not found');
        return row;
    };

    public list = async (scope: ShopScope, query: ReturnList) => {
        const where: Prisma.SalesReturnWhereInput = {
            shopId: scope.shopId,
            ...(query.salesBillId ? {salesBillId: query.salesBillId} : {}),
            ...(query.search
                ? {
                      OR: [
                          {returnNumber: {contains: query.search, mode: 'insensitive'}},
                          {customerName: {contains: query.search, mode: 'insensitive'}},
                          {customerPhone: {contains: query.search, mode: 'insensitive'}},
                          {salesBill: {billNumber: {contains: query.search, mode: 'insensitive'}}},
                      ],
                  }
                : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.salesReturn.findMany({where, ...listArgs(query), include: RETURN_INCLUDE}),
            prisma.salesReturn.count({where}),
        ]);
        return toListResult(items, total, query);
    };

    public create = async (scope: ShopScope, actorId: string, data: CreateReturn) => {
        const shop = await billService.shopContext(scope);

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    // Lock the bill (bumps its version) so edits / other returns wait
                    const {count} = await tx.salesBill.updateMany({
                        where: {
                            id: data.salesBillId,
                            shopId: shop.id,
                            deletedAt: null,
                            status: BillStatus.CONFIRMED,
                        },
                        data: {version: {increment: 1}},
                    });
                    if (!count) {
                        throw new ApiError(
                            httpStatus.BAD_REQUEST,
                            'Only confirmed sales bills of this shop can be returned',
                        );
                    }
                    const bill = await tx.salesBill.findUniqueOrThrow({
                        where: {id: data.salesBillId},
                        include: {items: {include: {returnItems: {select: {quantity: true}}}}},
                    });

                    // Bill discount is spread over the lines in proportion to their value
                    const linesTotal = bill.items.reduce((sum, i) => sum + i.totalPrice, 0);
                    const factor = linesTotal > 0 ? bill.totalAmount / linesTotal : 0;
                    const byId = new Map(bill.items.map((i) => [i.id, i]));

                    const lines = data.items.map((r) => {
                        const item = byId.get(r.salesBillItemId);
                        if (!item) {
                            throw new ApiError(
                                httpStatus.BAD_REQUEST,
                                'One or more items are not on this bill',
                            );
                        }
                        const returned = item.returnItems.reduce((sum, x) => sum + x.quantity, 0);
                        const left = item.quantity - returned;
                        if (r.quantity > left) {
                            throw new ApiError(
                                httpStatus.BAD_REQUEST,
                                left > 0
                                    ? `Only ${left} of "${item.productName ?? 'this item'}" can still be returned`
                                    : `"${item.productName ?? 'This item'}" has already been fully returned`,
                            );
                        }
                        const unitPrice = round2((item.totalPrice / item.quantity) * factor);
                        return {
                            salesBillItemId: item.id,
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: r.quantity,
                            unitPrice,
                            totalPrice: round2(unitPrice * r.quantity),
                        };
                    });
                    const totalAmount = round2(lines.reduce((sum, l) => sum + l.totalPrice, 0));

                    if (data.refundMode === 'ADJUST_DUE') {
                        if (totalAmount > bill.balanceDue) {
                            throw new ApiError(
                                httpStatus.BAD_REQUEST,
                                bill.balanceDue > 0
                                    ? `Return value ₹${totalAmount} is more than the balance due ₹${bill.balanceDue}; choose another refund mode`
                                    : 'Nothing is due on this bill; choose another refund mode',
                            );
                        }
                        const balanceDue = round2(bill.balanceDue - totalAmount);
                        await tx.salesBill.update({
                            where: {id: bill.id},
                            data: {
                                balanceDue,
                                paymentStatus: paymentStatusOf(bill.amountPaid, balanceDue),
                            },
                        });
                    }

                    const returnNumber = await this.nextReturnNumber(tx, shop.id);
                    const row = await tx.salesReturn.create({
                        data: {
                            returnNumber,
                            companyId: shop.companyId,
                            branchId: shop.branchId,
                            shopId: shop.id,
                            salesBillId: bill.id,
                            customerName: bill.customerName,
                            customerPhone: bill.customerPhone,
                            totalAmount,
                            refundMode: data.refundMode,
                            reason: data.reason,
                            createdById: actorId,
                            items: {create: lines},
                        },
                    });

                    await inventoryService.applyStockChanges(tx, {
                        branchId: shop.branchId,
                        changes: lines.map((l) => ({
                            variantId: l.variantId,
                            productId: l.productId,
                            delta: l.quantity,
                            type: MovementType.RETURN_RESTOCK,
                        })),
                        reason: `Credit note ${returnNumber} against ${bill.billNumber}`,
                        reference: returnNumber,
                        sourceType: StockSourceType.RETURN,
                        sourceId: row.id,
                        performedById: actorId,
                    });
                    let exchangeBillNumber: string | null = null;
                    if (data.refundMode === 'EXCHANGE' && data.exchangeItems && data.exchangeItems.length > 0) {
                        const exVariants = await tx.productVariant.findMany({
                            where: {id: {in: data.exchangeItems.map((i) => i.variantId)}},
                            include: {product: true},
                        });
                        const vMap = new Map(exVariants.map((v) => [v.id, v]));
                        let exSubtotal = 0;
                        let exTax = 0;
                        const exLines = data.exchangeItems.map((item) => {
                            const v = vMap.get(item.variantId);
                            const net = round2(item.quantity * item.unitPrice);
                            const tax = round2((net * item.taxRate) / 100);
                            exSubtotal += net;
                            exTax += tax;
                            return {
                                productId: v?.productId ?? '',
                                variantId: item.variantId,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                taxRate: item.taxRate,
                                totalPrice: round2(net + tax),
                                productName: v?.product.name,
                                variantSku: v?.variantSku,
                                size: v?.size,
                                color: v?.color,
                            };
                        });
                        const exTotal = round2(exSubtotal + exTax);
                        const amountPaid = Math.min(totalAmount, exTotal);
                        const balanceDue = Math.max(0, round2(exTotal - totalAmount));

                        const prefix = `${shop.billPrefix || shop.code}/${financialYear()}/`;
                        const newBillNumber = await accountService.nextCode(tx, prefix, 5, async (p) => {
                            const rws = await tx.salesBill.findMany({
                                where: {shopId: shop.id, billNumber: {startsWith: p}},
                                select: {billNumber: true},
                            });
                            return rws.map((r) => r.billNumber);
                        });

                        const newBill = await tx.salesBill.create({
                            data: {
                                billNumber: newBillNumber,
                                companyId: shop.companyId,
                                branchId: shop.branchId,
                                shopId: shop.id,
                                customerName: bill.customerName,
                                customerPhone: bill.customerPhone,
                                paymentMethod: 'CASH',
                                subtotal: round2(exSubtotal),
                                discount: 0,
                                taxAmount: round2(exTax),
                                totalAmount: exTotal,
                                amountPaid,
                                balanceDue,
                                paymentStatus: paymentStatusOf(amountPaid, balanceDue),
                                notes: `Exchange against return ${returnNumber}`,
                                createdById: actorId,
                                items: {create: exLines},
                                payments: {
                                    create: [{
                                        mode: 'CASH',
                                        amount: amountPaid,
                                        note: `From Credit Note ${returnNumber}`,
                                        receivedById: actorId,
                                    }],
                                },
                            },
                        });

                        await inventoryService.applyStockChanges(tx, {
                            branchId: shop.branchId,
                            changes: exLines.map((l) => ({
                                variantId: l.variantId,
                                productId: l.productId,
                                delta: -l.quantity,
                                type: MovementType.SALE_OUT,
                            })),
                            reason: `Exchange bill ${newBillNumber} against return ${returnNumber}`,
                            reference: newBillNumber,
                            sourceType: StockSourceType.SALES_BILL,
                            sourceId: newBill.id,
                            performedById: actorId,
                        });
                    }
                    return {row, exchangeBillNumber};
                }),
            'returnNumber',
        );
        const record = await this.get(scope, created.row.id);
        return {
            ...record,
            newBillNumber: created.exchangeBillNumber,
        };
    };
}

export default new SalesReturnService();
