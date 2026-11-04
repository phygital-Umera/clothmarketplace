import httpStatus from 'http-status';
import {
    BillStatus,
    CreditNoteStatus,
    MovementType,
    Prisma,
    ReturnSettlement,
    ReturnStockTo,
    StockSourceType,
} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {listArgs, toListResult} from '../utils/list';
import creditNoteValidation from '../validations/creditNote.validation';
import accountService from './account.service';
import inventoryService from './inventory.service';

type Tx = Prisma.TransactionClient;
type CreateNote = z.infer<typeof creditNoteValidation.createCreditNoteSchema>;
type DecideNote = z.infer<typeof creditNoteValidation.decideCreditNoteSchema>;
type NoteList = z.infer<typeof creditNoteValidation.creditNoteListSchema>;
type NoteSummary = z.infer<typeof creditNoteValidation.creditNoteSummarySchema>;

/** Shop admin: own shop. Branch admin: every shop of the branch. */
export type NoteScope = {companyId: string; shopId?: string; branchId?: string};

/** Refunds above this amount (or any cash refund) wait for the branch admin */
export const REFUND_APPROVAL_LIMIT = 2000;

const round2 = (v: number) => Math.round(v * 100) / 100;

const scopeWhere = (scope: NoteScope) => ({
    companyId: scope.companyId,
    ...(scope.shopId ? {shopId: scope.shopId} : {branchId: scope.branchId}),
});

const NOTE_INCLUDE = {
    shop: {select: {id: true, name: true, code: true}},
    salesBill: {select: {id: true, billNumber: true, billDate: true, paymentMethod: true}},
    createdBy: {select: {id: true, fullname: true}},
    decidedBy: {select: {id: true, fullname: true}},
    items: true,
} satisfies Prisma.CreditNoteInclude;

const startOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
};

const endOfDay = (d: Date) => {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
};

class CreditNoteService {
    /**
     * Lines of a confirmed bill with the quantity still returnable: sold minus
     * what is already on notes that were not rejected.
     */
    private async returnableLines(tx: Tx | typeof prisma, billId: string) {
        const items = await tx.salesBillItem.findMany({
            where: {billId},
            include: {
                creditNoteItems: {
                    where: {creditNote: {status: {not: CreditNoteStatus.REJECTED}}},
                    select: {quantity: true},
                },
            },
        });
        return items.map((item) => {
            const returned = item.creditNoteItems.reduce((t, c) => t + c.quantity, 0);
            const {creditNoteItems, ...rest} = item;
            void creditNoteItems;
            return {...rest, returned, returnable: Math.max(item.quantity - returned, 0)};
        });
    }

    /** Units go back on the shelf only for RESTOCK; damaged stock stays out */
    private async postStock(
        tx: Tx,
        note: {
            id: string;
            noteNumber: string;
            branchId: string;
            items: {variantId: string; productId: string; quantity: number}[];
        },
        actorId: string,
    ) {
        await inventoryService.applyStockChanges(tx, {
            branchId: note.branchId,
            changes: note.items.map((i) => ({
                variantId: i.variantId,
                productId: i.productId,
                delta: i.quantity,
                type: MovementType.RETURN_RESTOCK,
            })),
            reason: `Credit note ${note.noteNumber} approved`,
            reference: note.noteNumber,
            sourceType: StockSourceType.RETURN,
            sourceId: note.id,
            performedById: actorId,
        });
    }

    private async nextNumber(tx: Tx, shopId: string) {
        const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return accountService.nextCode(tx, `CN-${day}-`, 4, async (p) => {
            const rows = await tx.creditNote.findMany({
                where: {shopId, noteNumber: {startsWith: p}},
                select: {noteNumber: true},
            });
            return rows.map((r) => r.noteNumber);
        });
    }

    /** For the shop's new-return form: find a bill by number and what can still come back */
    public returnable = async (scope: NoteScope, billNumber: string) => {
        const bill = await prisma.salesBill.findFirst({
            where: {...scopeWhere(scope), billNumber, deletedAt: null},
            select: {
                id: true,
                billNumber: true,
                billDate: true,
                status: true,
                customerName: true,
                customerPhone: true,
                paymentMethod: true,
                totalAmount: true,
            },
        });
        if (!bill)
            throw new ApiError(httpStatus.NOT_FOUND, `No sales bill ${billNumber} in this shop`);
        if (bill.status !== BillStatus.CONFIRMED) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Sales bill ${billNumber} is ${bill.status.toLowerCase()}; only confirmed bills can be returned`,
            );
        }
        return {...bill, items: await this.returnableLines(prisma, bill.id)};
    };

    public create = async (
        scope: NoteScope & {shopId: string},
        actorId: string,
        data: CreateNote,
    ) => {
        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const bill = await tx.salesBill.findFirst({
                        where: {id: data.salesBillId, ...scopeWhere(scope), deletedAt: null},
                    });
                    if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Sales bill not found');
                    if (bill.status !== BillStatus.CONFIRMED) {
                        throw new ApiError(
                            httpStatus.BAD_REQUEST,
                            'Only confirmed sales bills can be returned',
                        );
                    }

                    const lines = await this.returnableLines(tx, bill.id);
                    // Spread the bill-level discount over the lines, as the customer paid it
                    const linesTotal = lines.reduce((t, l) => t + l.totalPrice, 0);
                    const factor = linesTotal ? bill.totalAmount / linesTotal : 1;

                    const items = data.items.map((req) => {
                        const line = lines.find((l) => l.id === req.salesBillItemId);
                        if (!line) {
                            throw new ApiError(
                                httpStatus.BAD_REQUEST,
                                'An item is not on this sales bill',
                            );
                        }
                        const name = line.productName ?? 'this item';
                        if (req.quantity > line.returnable) {
                            throw new ApiError(
                                httpStatus.BAD_REQUEST,
                                line.returnable
                                    ? `Only ${line.returnable} unit(s) of ${name} can still be returned`
                                    : `${name} has already been returned in full`,
                            );
                        }
                        const unitPrice = round2((line.totalPrice / line.quantity) * factor);
                        const totalAmount = round2(unitPrice * req.quantity);
                        const taxAmount = round2(
                            (totalAmount * line.taxRate) / (100 + line.taxRate),
                        );
                        return {
                            salesBillItemId: line.id,
                            productId: line.productId,
                            variantId: line.variantId,
                            quantity: req.quantity,
                            unitPrice,
                            taxRate: line.taxRate,
                            taxableAmount: round2(totalAmount - taxAmount),
                            taxAmount,
                            totalAmount,
                            productName: line.productName,
                            variantSku: line.variantSku,
                            size: line.size,
                            color: line.color,
                        };
                    });

                    const totalAmount = round2(items.reduce((t, i) => t + i.totalAmount, 0));
                    const taxAmount = round2(items.reduce((t, i) => t + i.taxAmount, 0));
                    const isRefund = data.settlement === ReturnSettlement.REFUND;
                    const needsApproval =
                        isRefund &&
                        (data.refundMode === 'CASH' || totalAmount > REFUND_APPROVAL_LIMIT);

                    const note = await tx.creditNote.create({
                        data: {
                            noteNumber: await this.nextNumber(tx, bill.shopId),
                            companyId: bill.companyId,
                            branchId: bill.branchId,
                            shopId: bill.shopId,
                            salesBillId: bill.id,
                            customerName: bill.customerName,
                            customerPhone: bill.customerPhone,
                            settlement: data.settlement,
                            refundMode: isRefund ? data.refundMode : null,
                            reason: data.reason,
                            reasonNote: data.reasonNote || null,
                            taxableAmount: round2(totalAmount - taxAmount),
                            taxAmount,
                            totalAmount,
                            needsApproval,
                            status: needsApproval
                                ? CreditNoteStatus.PENDING_APPROVAL
                                : CreditNoteStatus.APPROVED,
                            // Pending notes take the branch admin's choice later
                            stockTo: needsApproval ? null : data.stockTo,
                            decidedAt: needsApproval ? null : new Date(),
                            createdById: actorId,
                            items: {create: items},
                        },
                        include: {items: true},
                    });
                    if (!needsApproval && data.stockTo === ReturnStockTo.RESTOCK) {
                        await this.postStock(tx, note, actorId);
                    }
                    return note;
                }),
            'noteNumber',
        );
        return this.get(scope, created.id);
    };

    /** Branch admin: approve, settle as store credit instead, or reject */
    public decide = async (scope: NoteScope, actorId: string, id: string, data: DecideNote) => {
        await prisma.$transaction(async (tx) => {
            const approved = data.action !== 'REJECT';
            const {count} = await tx.creditNote.updateMany({
                where: {id, ...scopeWhere(scope), status: CreditNoteStatus.PENDING_APPROVAL},
                data: {
                    status: approved ? CreditNoteStatus.APPROVED : CreditNoteStatus.REJECTED,
                    stockTo: approved ? data.stockTo : null,
                    decisionNote: data.note || null,
                    decidedById: actorId,
                    decidedAt: new Date(),
                    ...(data.action === 'STORE_CREDIT'
                        ? {settlement: ReturnSettlement.STORE_CREDIT, refundMode: null}
                        : {}),
                },
            });
            if (!count) {
                const current = await tx.creditNote.findFirst({
                    where: {id, ...scopeWhere(scope)},
                    select: {status: true},
                });
                if (!current) throw new ApiError(httpStatus.NOT_FOUND, 'Credit note not found');
                throw new ApiError(
                    httpStatus.CONFLICT,
                    'This credit note has already been decided. Reload to see the latest.',
                );
            }
            if (approved && data.stockTo === ReturnStockTo.RESTOCK) {
                const note = await tx.creditNote.findUniqueOrThrow({
                    where: {id},
                    include: {items: true},
                });
                await this.postStock(tx, note, actorId);
            }
        });
        return this.get(scope, id);
    };

    public get = async (scope: NoteScope, id: string) => {
        const note = await prisma.creditNote.findFirst({
            where: {id, ...scopeWhere(scope)},
            include: NOTE_INCLUDE,
        });
        if (!note) throw new ApiError(httpStatus.NOT_FOUND, 'Credit note not found');
        return note;
    };

    private tabWhere(tab?: NoteList['tab']): Prisma.CreditNoteWhereInput {
        switch (tab) {
            case 'NEEDS_APPROVAL':
                return {status: CreditNoteStatus.PENDING_APPROVAL};
            case 'EXCHANGE':
                return {settlement: ReturnSettlement.EXCHANGE, status: CreditNoteStatus.APPROVED};
            case 'STORE_CREDIT':
                return {
                    settlement: ReturnSettlement.STORE_CREDIT,
                    status: CreditNoteStatus.APPROVED,
                };
            case 'REFUNDED':
                return {settlement: ReturnSettlement.REFUND, status: CreditNoteStatus.APPROVED};
            case 'REJECTED':
                return {status: CreditNoteStatus.REJECTED};
            default:
                return {};
        }
    }

    public list = async (scope: NoteScope, query: NoteList) => {
        const search = query.search
            ? {
                  OR: [
                      {noteNumber: {contains: query.search, mode: 'insensitive' as const}},
                      {customerName: {contains: query.search, mode: 'insensitive' as const}},
                      {customerPhone: {contains: query.search, mode: 'insensitive' as const}},
                      {
                          salesBill: {
                              billNumber: {contains: query.search, mode: 'insensitive' as const},
                          },
                      },
                  ],
              }
            : {};
        const where: Prisma.CreditNoteWhereInput = {
            ...scopeWhere(scope),
            ...(!scope.shopId && query.shopId ? {shopId: query.shopId} : {}),
            ...this.tabWhere(query.tab),
            ...(query.from || query.to
                ? {
                      createdAt: {
                          ...(query.from ? {gte: query.from} : {}),
                          ...(query.to ? {lte: endOfDay(query.to)} : {}),
                      },
                  }
                : {}),
            ...search,
        };
        const [items, total] = await prisma.$transaction([
            prisma.creditNote.findMany({where, ...listArgs(query), include: NOTE_INCLUDE}),
            prisma.creditNote.count({where}),
        ]);
        return toListResult(items, total, query);
    };

    /** Branch page figures: this month, plus open store credit (all time) */
    public summary = async (scope: NoteScope, query: NoteSummary) => {
        const base = {
            ...scopeWhere(scope),
            ...(!scope.shopId && query.shopId ? {shopId: query.shopId} : {}),
        };
        const month = {...base, createdAt: {gte: startOfMonth()}};
        const approved = {...month, status: CreditNoteStatus.APPROVED};

        const [monthNotes, exchanged, storeCredit, pending, sales, tabs] = await Promise.all([
            prisma.creditNote.aggregate({
                where: {...month, status: {not: CreditNoteStatus.REJECTED}},
                _count: {_all: true},
                _sum: {totalAmount: true},
            }),
            prisma.creditNote.count({
                where: {...approved, settlement: ReturnSettlement.EXCHANGE},
            }),
            prisma.creditNote.groupBy({
                by: ['customerPhone'],
                where: {
                    ...base,
                    status: CreditNoteStatus.APPROVED,
                    settlement: ReturnSettlement.STORE_CREDIT,
                },
                _sum: {totalAmount: true},
            }),
            prisma.creditNote.findMany({
                where: {...base, status: CreditNoteStatus.PENDING_APPROVAL},
                select: {totalAmount: true, refundMode: true},
            }),
            prisma.salesBill.aggregate({
                where: {
                    ...base,
                    deletedAt: null,
                    status: BillStatus.CONFIRMED,
                    billDate: {gte: startOfMonth()},
                },
                _sum: {totalAmount: true},
            }),
            prisma.creditNote.groupBy({
                by: ['status', 'settlement'],
                where: base,
                _count: {_all: true},
            }),
        ]);

        const returned = monthNotes._sum.totalAmount ?? 0;
        const salesValue = sales._sum.totalAmount ?? 0;
        const tabCount = (status: CreditNoteStatus, settlement?: ReturnSettlement) =>
            tabs
                .filter((t) => t.status === status && (!settlement || t.settlement === settlement))
                .reduce((n, t) => n + t._count._all, 0);

        return {
            approvalLimit: REFUND_APPROVAL_LIMIT,
            month: {
                notes: monthNotes._count._all,
                value: round2(returned),
                exchanged,
                returnRate: salesValue ? round2((returned / salesValue) * 100) : 0,
            },
            storeCredit: {
                open: round2(storeCredit.reduce((t, s) => t + (s._sum.totalAmount ?? 0), 0)),
                // Notes without a mobile number are counted as one walk-in group
                customers: storeCredit.length,
            },
            approvals: {
                pending: pending.length,
                cashPending: round2(
                    pending
                        .filter((p) => p.refundMode === 'CASH')
                        .reduce((t, p) => t + p.totalAmount, 0),
                ),
            },
            tabs: {
                all: tabs.reduce((n, t) => n + t._count._all, 0),
                needsApproval: tabCount(CreditNoteStatus.PENDING_APPROVAL),
                exchange: tabCount(CreditNoteStatus.APPROVED, ReturnSettlement.EXCHANGE),
                storeCredit: tabCount(CreditNoteStatus.APPROVED, ReturnSettlement.STORE_CREDIT),
                refunded: tabCount(CreditNoteStatus.APPROVED, ReturnSettlement.REFUND),
                rejected: tabCount(CreditNoteStatus.REJECTED),
            },
        };
    };
}

export default new CreditNoteService();
