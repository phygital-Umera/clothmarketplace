import httpStatus from 'http-status';
import {ShopStatus} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {dateOnly, dayRange, round2} from '../utils/day';
import {dayCloseValidation} from '@validations/index';
import cashBookService from './cashBook.service';
import {BranchScope} from './customerDue.service';

type ResolveDiff = z.infer<typeof dayCloseValidation.resolveDifferenceSchema>;
type RecordDeposit = z.infer<typeof dayCloseValidation.bankDepositSchema>;

export type DayCloseShopRow = {
    id: string;
    sessionId: string | null;
    shopId: string;
    shopName: string;
    closedBy: string;
    opening: number;
    cashSales: number;
    duesCollected: number;
    cashOut: number;
    expected: number;
    counted: number;
    diff: number;
    depositAmount: number;
    keptFloat: number;
    status: 'ACCEPTED' | 'NEEDS_REVIEW' | 'OPEN' | 'NOT_OPENED';
    reason?: string | null;
    action?: string | null;
    note?: string | null;
};

/**
 * Branch view of every shop's day close: what each counter expected, what
 * was counted, differences to review and the day's bank deposit. All figures
 * come from the shops' cash books.
 */
class DayCloseService {
    public async getDayClose(scope: BranchScope, date: string) {
        const {start, end} = dayRange(date);
        const [shops, deposits] = await Promise.all([
            prisma.shop.findMany({
                where: {
                    branchId: scope.branchId,
                    companyId: scope.companyId,
                    deletedAt: null,
                    status: ShopStatus.ACTIVE,
                },
                select: {id: true, name: true},
                orderBy: {name: 'asc'},
            }),
            prisma.bankDeposit.findMany({
                where: {branchId: scope.branchId, depositDate: dateOnly(date)},
                orderBy: {createdAt: 'asc'},
            }),
        ]);
        const sessions = await prisma.counterSession.findMany({
            where: {shopId: {in: shops.map((s) => s.id)}, openedAt: {gte: start, lt: end}},
            orderBy: {openedAt: 'desc'},
        });
        const userIds = sessions.flatMap((s) => [s.closedById, s.openedById]).filter(Boolean) as string[];
        const users = await prisma.user.findMany({
            where: {id: {in: [...new Set(userIds)]}},
            select: {id: true, fullname: true},
        });
        const nameOf = new Map(users.map((u) => [u.id, u.fullname]));

        const rows: DayCloseShopRow[] = await Promise.all(
            shops.map(async (shop) => {
                const session = sessions.find((s) => s.shopId === shop.id);
                if (!session) {
                    return {
                        id: shop.id,
                        sessionId: null,
                        shopId: shop.id,
                        shopName: shop.name,
                        closedBy: '—',
                        opening: 0,
                        cashSales: 0,
                        duesCollected: 0,
                        cashOut: 0,
                        expected: 0,
                        counted: 0,
                        diff: 0,
                        depositAmount: 0,
                        keptFloat: 0,
                        status: 'NOT_OPENED' as const,
                    };
                }
                const d = await cashBookService.drawer(session);
                const closed = !!session.closedAt;
                const diff = closed ? (session.difference ?? 0) : 0;
                return {
                    id: session.id,
                    sessionId: session.id,
                    shopId: shop.id,
                    shopName: shop.name,
                    closedBy: closed
                        ? (nameOf.get(session.closedById ?? '') ?? '—')
                        : `Open · ${nameOf.get(session.openedById) ?? ''}`.trim(),
                    opening: session.openingCash,
                    cashSales: d.cashSales,
                    duesCollected: d.duesCollected,
                    cashOut: d.cashOut,
                    expected: closed ? (session.expectedCash ?? d.expected) : d.expected,
                    counted: closed ? (session.closingCash ?? 0) : 0,
                    diff,
                    depositAmount: session.depositAmount ?? 0,
                    keptFloat: session.keptFloat ?? 0,
                    status: !closed
                        ? ('OPEN' as const)
                        : diff === 0 || session.reviewStatus === 'ACCEPTED'
                          ? ('ACCEPTED' as const)
                          : ('NEEDS_REVIEW' as const),
                    reason: session.differenceReason,
                    action: session.reviewAction,
                    note: session.reviewNote,
                };
            }),
        );

        const sum = (k: keyof DayCloseShopRow) =>
            round2(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
        const closedRows = rows.filter((r) => r.status === 'ACCEPTED' || r.status === 'NEEDS_REVIEW');
        const diffRows = closedRows.filter((r) => r.diff !== 0);
        const deposited = round2(deposits.reduce((s, d) => s + d.amount, 0));
        const toBank = round2(closedRows.reduce((s, r) => s + r.depositAmount, 0));

        return {
            date,
            summary: {
                cashSales: sum('cashSales'),
                countersCount: closedRows.length,
                shopsCount: rows.length,
                counted: round2(closedRows.reduce((s, r) => s + r.counted, 0)),
                openingFloats: sum('opening'),
                difference: round2(diffRows.reduce((s, r) => s + r.diff, 0)),
                differenceShop: diffRows.length
                    ? diffRows.map((r) => r.shopName).join(', ')
                    : 'Balanced',
                toBank,
                deposited,
                depositStatus: deposits.length
                    ? `Deposited ₹${deposited.toLocaleString('en-IN')}`
                    : toBank > 0
                      ? 'Deposit slip pending'
                      : 'Nothing to deposit',
            },
            shops: rows,
            totals: {
                opening: sum('opening'),
                cashSales: sum('cashSales'),
                duesCollected: sum('duesCollected'),
                cashOut: sum('cashOut'),
                expected: sum('expected'),
                counted: sum('counted'),
                diff: sum('diff'),
            },
            deposits: deposits.map((d) => ({
                id: d.id,
                amount: d.amount,
                bank: d.bank,
                reference: d.reference,
                createdAt: d.createdAt,
            })),
            reviewItem: rows.find((s) => s.status === 'NEEDS_REVIEW') || null,
        };
    }

    /** Accept a counter's difference with the reason and follow-up action */
    public async resolveDifference(scope: BranchScope, actorId: string, payload: ResolveDiff) {
        const session = await prisma.counterSession.findFirst({
            where: {
                id: payload.sessionId,
                closedAt: {not: null},
                shop: {branchId: scope.branchId, companyId: scope.companyId},
            },
            include: {shop: {select: {name: true}}},
        });
        if (!session) throw new ApiError(httpStatus.NOT_FOUND, 'Closed counter day not found');
        if (session.reviewStatus === 'ACCEPTED') {
            throw new ApiError(httpStatus.CONFLICT, 'This day close was already accepted');
        }
        await prisma.counterSession.update({
            where: {id: session.id},
            data: {
                reviewStatus: 'ACCEPTED',
                differenceReason: payload.reason,
                reviewAction: payload.action,
                reviewNote: payload.note,
            },
        });
        void actorId;
        return {success: true, message: `Day close accepted for ${session.shop.name}`};
    }

    public async recordDeposit(scope: BranchScope, actorId: string, payload: RecordDeposit) {
        const deposit = await prisma.bankDeposit.create({
            data: {
                companyId: scope.companyId,
                branchId: scope.branchId,
                depositDate: dateOnly(payload.date),
                amount: payload.amount,
                bank: payload.bank,
                reference: payload.depositSlipUtr,
                slipUrl: payload.slipUrl,
                createdById: actorId,
            },
        });
        return {
            success: true,
            deposit,
            message: `Bank deposit of ₹${payload.amount.toLocaleString('en-IN')} recorded successfully`,
        };
    }
}

export default new DayCloseService();
