import httpStatus from 'http-status';
import {BillStatus, CounterSession, Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {dayKey, dayRange, round2} from '../utils/day';
import {cashBookValidation} from '@validations/index';
import billService from './bill.service';
import {ShopScope} from './shopProduct.service';

type AddEntry = z.infer<typeof cashBookValidation.addEntrySchema>;
type BankDepositInput = z.infer<typeof cashBookValidation.bankDepositSchema>;
type CloseDay = z.infer<typeof cashBookValidation.closeDaySchema>;

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5] as const;

export type CashRow = {
    id: string;
    time: Date;
    kind:
        | 'OPENING'
        | 'SALE'
        | 'DUE'
        | 'REFUND'
        | 'EXPENSE'
        | 'PURCHASE'
        | 'SUPPLIER'
        | 'IN'
        | 'OUT'
        | 'BANK_DEPOSIT';
    particulars: string;
    sub: string | null;
    ref: string | null;
    cashIn: number;
    cashOut: number;
    balance: number;
};

/** What the drawer should hold, and where it came from */
export type DrawerSummary = {
    openingCash: number;
    cashSales: number;
    duesCollected: number;
    cashRefunds: number;
    cashExpenses: number;
    supplierPayments: number;
    manualIn: number;
    manualOut: number;
    bankDeposits: number;
    cashIn: number;
    cashOut: number;
    expected: number;
    cashBills: number;
    outEntries: number;
};

const ENTRY_LABEL: Record<string, string> = {
    IN: 'Cash in',
    OUT: 'Cash out',
    BANK_DEPOSIT: 'Bank deposit',
};

/**
 * The counter's cash book: every rupee in and out of the drawer for one
 * counter session, built from the bills, returns, expenses and supplier
 * payments of the shop plus manual cash entries. Day close counts the notes
 * and locks the day.
 */
class CashBookService {
    private names = async (ids: Array<string | null | undefined>) => {
        const unique = [...new Set(ids.filter((v): v is string => !!v))];
        if (!unique.length) return new Map<string, string>();
        const users = await prisma.user.findMany({
            where: {id: {in: unique}},
            select: {id: true, fullname: true},
        });
        return new Map(users.map((u) => [u.id, u.fullname]));
    };

    /**
     * Cash movements of a shop in [since, until]. Customer dues paid through
     * Credit / Udhaar are allocated to bills as SalesBillPayment rows, so they
     * are counted here once (as "Due collected").
     */
    public movements = async (shopId: string, since: Date, until: Date) => {
        const window = {gte: since, lte: until};
        const confirmedSales: Prisma.SalesBillWhereInput = {
            shopId,
            deletedAt: null,
            status: BillStatus.CONFIRMED,
        };
        const [sales, refunds, expenses, purchases, supplierPays, entries] = await Promise.all([
            prisma.salesBillPayment.findMany({
                where: {mode: 'CASH', paidAt: window, bill: confirmedSales},
                select: {
                    id: true,
                    amount: true,
                    paidAt: true,
                    atBilling: true,
                    note: true,
                    receivedById: true,
                    bill: {select: {billNumber: true, customerName: true, totalAmount: true}},
                },
            }),
            prisma.salesReturn.findMany({
                where: {shopId, refundMode: 'CASH', createdAt: window},
                select: {
                    id: true,
                    returnNumber: true,
                    customerName: true,
                    totalAmount: true,
                    createdAt: true,
                },
            }),
            prisma.expense.findMany({
                where: {shopId, mode: 'CASH', createdAt: window},
                select: {
                    id: true,
                    category: true,
                    amount: true,
                    notes: true,
                    createdAt: true,
                    createdBy: {select: {fullname: true}},
                },
            }),
            prisma.purchaseBillPayment.findMany({
                where: {
                    mode: 'CASH',
                    paidAt: window,
                    bill: {shopId, deletedAt: null, status: BillStatus.CONFIRMED},
                },
                select: {
                    id: true,
                    amount: true,
                    paidAt: true,
                    bill: {select: {billNumber: true, supplierName: true}},
                },
            }),
            prisma.supplierPayment.findMany({
                where: {
                    shopId,
                    paymentDate: window,
                    OR: [
                        {paymentMode: {contains: 'cash', mode: 'insensitive'}},
                        {paidFrom: {contains: 'cash', mode: 'insensitive'}},
                    ],
                },
                select: {
                    id: true,
                    amount: true,
                    paymentDate: true,
                    supplierName: true,
                    receiptNumber: true,
                },
            }),
            prisma.cashEntry.findMany({
                where: {shopId, createdAt: window},
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    particulars: true,
                    reference: true,
                    bankName: true,
                    createdAt: true,
                    createdById: true,
                },
            }),
        ]);
        const names = await this.names(entries.map((e) => e.createdById));

        const rows: Omit<CashRow, 'balance'>[] = [
            ...sales.map((p) => ({
                id: p.id,
                time: p.paidAt,
                kind: (p.atBilling ? 'SALE' : 'DUE') as CashRow['kind'],
                particulars: !p.atBilling
                    ? 'Due collected'
                    : p.amount < p.bill.totalAmount - 0.009
                      ? 'Cash sale (part)'
                      : 'Cash sale',
                sub: p.bill.customerName || 'Walk-in',
                ref: p.bill.billNumber,
                cashIn: p.amount,
                cashOut: 0,
            })),
            ...refunds.map((r) => ({
                id: r.id,
                time: r.createdAt,
                kind: 'REFUND' as const,
                particulars: 'Cash refund',
                sub: r.customerName || 'Walk-in',
                ref: r.returnNumber,
                cashIn: 0,
                cashOut: r.totalAmount,
            })),
            ...expenses.map((e) => ({
                id: e.id,
                time: e.createdAt,
                kind: 'EXPENSE' as const,
                particulars: `Expense · ${e.notes?.trim() || e.category.toLowerCase()}`,
                sub: e.createdBy.fullname,
                ref: null,
                cashIn: 0,
                cashOut: e.amount,
            })),
            ...purchases.map((p) => ({
                id: p.id,
                time: p.paidAt,
                kind: 'PURCHASE' as const,
                particulars: 'Purchase payment',
                sub: p.bill.supplierName,
                ref: p.bill.billNumber,
                cashIn: 0,
                cashOut: p.amount,
            })),
            ...supplierPays.map((p) => ({
                id: p.id,
                time: p.paymentDate,
                kind: 'SUPPLIER' as const,
                particulars: 'Supplier payment',
                sub: p.supplierName,
                ref: p.receiptNumber,
                cashIn: 0,
                cashOut: p.amount,
            })),
            ...entries.map((e) => ({
                id: e.id,
                time: e.createdAt,
                kind: e.type as CashRow['kind'],
                particulars:
                    e.type === 'BANK_DEPOSIT'
                        ? `Bank deposit${e.bankName ? ` · ${e.bankName}` : ''}`
                        : `${ENTRY_LABEL[e.type]} · ${e.particulars}`,
                sub: names.get(e.createdById) ?? null,
                ref: e.reference,
                cashIn: e.type === 'IN' ? e.amount : 0,
                cashOut: e.type === 'IN' ? 0 : e.amount,
            })),
        ].sort((a, b) => a.time.getTime() - b.time.getTime());

        const sum = (list: {amount: number}[]) => list.reduce((s, x) => s + x.amount, 0);
        const breakdown = {
            cashSales: round2(sum(sales.filter((p) => p.atBilling))),
            duesCollected: round2(sum(sales.filter((p) => !p.atBilling))),
            cashRefunds: round2(refunds.reduce((s, r) => s + r.totalAmount, 0)),
            cashExpenses: round2(sum(expenses)),
            supplierPayments: round2(sum(purchases) + sum(supplierPays)),
            manualIn: round2(sum(entries.filter((e) => e.type === 'IN'))),
            manualOut: round2(sum(entries.filter((e) => e.type === 'OUT'))),
            bankDeposits: round2(sum(entries.filter((e) => e.type === 'BANK_DEPOSIT'))),
            cashBills: new Set(sales.filter((p) => p.atBilling).map((p) => p.bill.billNumber)).size,
            outEntries: rows.filter((r) => r.cashOut > 0).length,
        };
        return {rows, breakdown};
    };

    /** Expected drawer cash for a session (until it closed, or now) */
    public drawer = async (
        session: Pick<CounterSession, 'shopId' | 'openedAt' | 'closedAt' | 'openingCash'>,
    ): Promise<DrawerSummary & {rows: CashRow[]}> => {
        const until = session.closedAt ?? new Date();
        const {rows, breakdown: b} = await this.movements(session.shopId, session.openedAt, until);
        let balance = session.openingCash;
        const withBalance = rows.map((r) => {
            balance = round2(balance + r.cashIn - r.cashOut);
            return {...r, balance};
        });
        const cashIn = round2(b.cashSales + b.duesCollected + b.manualIn);
        const cashOut = round2(
            b.cashRefunds + b.cashExpenses + b.supplierPayments + b.manualOut + b.bankDeposits,
        );
        return {
            ...b,
            openingCash: session.openingCash,
            cashIn,
            cashOut,
            expected: round2(session.openingCash + cashIn - cashOut),
            rows: withBalance,
        };
    };

    /** The latest counter session opened on that day */
    private sessionOn = (shopId: string, key: string) => {
        const {start, end} = dayRange(key);
        return prisma.counterSession.findFirst({
            where: {shopId, openedAt: {gte: start, lt: end}},
            orderBy: {openedAt: 'desc'},
        });
    };

    public getDay = async (scope: ShopScope, date?: string) => {
        const shop = await billService.shopContext(scope);
        const key = date ?? dayKey();
        const isToday = key === dayKey();
        const session = await this.sessionOn(shop.id, key);

        // Float kept at the last close: the suggested opening cash
        const lastClosed = await prisma.counterSession.findFirst({
            where: {shopId: shop.id, closedAt: {not: null}},
            orderBy: {closedAt: 'desc'},
            select: {keptFloat: true, closingCash: true},
        });
        const lastFloat = lastClosed ? (lastClosed.keptFloat ?? lastClosed.closingCash) : null;

        if (!session) {
            // No counter that day: still show the day's cash movements
            const {start, end} = dayRange(key);
            const until = isToday ? new Date() : end;
            const drawer = await this.drawer({
                shopId: shop.id,
                openedAt: start,
                closedAt: until,
                openingCash: 0,
            });
            return {date: key, isToday, session: null, lastFloat, denominations: DENOMINATIONS, ...drawer};
        }

        const drawer = await this.drawer(session);
        const names = await this.names([session.openedById, session.closedById]);
        const opening: CashRow = {
            id: `opening-${session.id}`,
            time: session.openedAt,
            kind: 'OPENING',
            particulars: 'Opening balance',
            sub: names.get(session.openedById) ? `Counted by ${names.get(session.openedById)}` : null,
            ref: null,
            cashIn: session.openingCash,
            cashOut: 0,
            balance: session.openingCash,
        };
        return {
            date: key,
            isToday,
            lastFloat,
            denominations: DENOMINATIONS,
            session: {
                id: session.id,
                status: session.closedAt ? ('CLOSED' as const) : ('OPEN' as const),
                openedAt: session.openedAt,
                openedBy: names.get(session.openedById) ?? null,
                closedAt: session.closedAt,
                closedBy: session.closedById ? (names.get(session.closedById) ?? null) : null,
                openingCash: session.openingCash,
                closingCash: session.closingCash,
                denominations: session.denominations as Record<string, number> | null,
                expectedCash: session.expectedCash,
                difference: session.difference,
                differenceReason: session.differenceReason,
                depositAmount: session.depositAmount,
                keptFloat: session.keptFloat,
                reviewStatus: session.reviewStatus,
            },
            ...drawer,
            rows: [opening, ...drawer.rows],
        };
    };

    private openSession = async (shopId: string) => {
        const open = await prisma.counterSession.findFirst({
            where: {shopId, closedAt: null},
            orderBy: {openedAt: 'desc'},
        });
        if (!open) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'Open the counter first: cash entries belong to an open cash book',
            );
        }
        return open;
    };

    /** Cash cannot leave the drawer if it is not there */
    private assertDrawerHas = async (session: CounterSession, amount: number) => {
        const {expected} = await this.drawer(session);
        if (amount > expected + 0.009) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Only ₹${expected.toLocaleString('en-IN')} is expected in the drawer`,
                [{field: 'amount', message: `Cannot be more than ₹${expected}`}],
            );
        }
    };

    public addEntry = async (scope: ShopScope, actorId: string, data: AddEntry) => {
        const shop = await billService.shopContext(scope);
        const session = await this.openSession(shop.id);
        if (data.type === 'OUT') await this.assertDrawerHas(session, data.amount);
        return prisma.cashEntry.create({
            data: {
                shopId: shop.id,
                sessionId: session.id,
                type: data.type,
                amount: data.amount,
                particulars: data.particulars,
                reference: data.reference,
                createdById: actorId,
            },
        });
    };

    public bankDeposit = async (scope: ShopScope, actorId: string, data: BankDepositInput) => {
        const shop = await billService.shopContext(scope);
        const session = await this.openSession(shop.id);
        await this.assertDrawerHas(session, data.amount);
        return prisma.cashEntry.create({
            data: {
                shopId: shop.id,
                sessionId: session.id,
                type: 'BANK_DEPOSIT',
                amount: data.amount,
                particulars: 'Bank deposit',
                bankName: data.bankName,
                reference: data.reference,
                createdById: actorId,
            },
        });
    };

    /**
     * Count the notes, compare with the expected cash and close the counter.
     * The count is split into what goes to the bank / owner and the float
     * kept for tomorrow.
     */
    public closeDay = async (scope: ShopScope, actorId: string, data: CloseDay) => {
        const shop = await billService.shopContext(scope);
        const session = await this.openSession(shop.id);

        const counted = round2(
            DENOMINATIONS.reduce((s, note) => s + note * ((data.denominations as Record<string, number | undefined>)[String(note)] ?? 0), 0),
        );
        if (round2(data.depositAmount + data.keptFloat) !== counted) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Deposit and float must add up to the counted cash (₹${counted.toLocaleString('en-IN')})`,
                [{field: 'depositAmount', message: 'Deposit + float must equal counted cash'}],
            );
        }

        return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'counter:' + shop.id}))`;
            const closedAt = new Date();
            const {expected} = await this.drawer({...session, closedAt});
            const difference = round2(counted - expected);
            if (difference !== 0 && !data.differenceReason) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `Counted cash is ₹${Math.abs(difference)} ${difference > 0 ? 'more' : 'less'} than expected. Explain the difference.`,
                    [{field: 'differenceReason', message: 'Explain the difference'}],
                );
            }
            const {count} = await tx.counterSession.updateMany({
                where: {id: session.id, closedAt: null},
                data: {
                    closedAt,
                    closedById: actorId,
                    closingCash: counted,
                    expectedCash: expected,
                    difference,
                    differenceReason: difference !== 0 ? data.differenceReason : null,
                    reviewStatus: difference === 0 ? 'ACCEPTED' : null,
                    denominations: Object.fromEntries(
                        DENOMINATIONS.map((n) => [String(n), (data.denominations as Record<string, number | undefined>)[String(n)] ?? 0]),
                    ),
                    depositAmount: data.depositAmount,
                    keptFloat: data.keptFloat,
                },
            });
            if (!count) throw new ApiError(httpStatus.CONFLICT, 'The day was already closed');
            return tx.counterSession.findUniqueOrThrow({where: {id: session.id}});
        });
    };
}

export default new CashBookService();
