import httpStatus from 'http-status';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {field} from '../validations/custom.validation';
import {BranchScope} from './customerDue.service';

/*
 * Branch expenses, from the real Expense rows of the branch: what the shops
 * logged themselves plus what the branch admin books here. A branch expense can
 * go to one shop, be split equally over the active shops, or stay at branch
 * level (no shop). Branch payments are never "CASH", so they never change a
 * shop's cash drawer.
 */

export const EXPENSE_HEADS = [
    'Rent',
    'Salaries',
    'Electricity',
    'Packing, porter, tea',
    'Repairs & Maintenance',
    'Other',
] as const;

export const PAID_FROM = {BANK: 'Branch bank', PETTY_CASH: 'Branch petty cash', OWNER: 'Owner'} as const;

export const addExpenseSchema = z.object({
    date: z
        .string({required_error: 'Date is required'})
        .refine((d) => !Number.isNaN(Date.parse(d)), 'Enter a valid date')
        .refine((d) => Date.parse(d) <= Date.now() + 60_000, 'Date cannot be in the future'),
    amount: z.coerce
        .number({invalid_type_error: 'Enter a valid amount'})
        .positive('Amount must be more than 0')
        .max(10_000_000, 'Amount is too large')
        .transform((v) => Math.round(v * 100) / 100),
    head: field({label: 'Head', kind: 'text', max: 60}),
    // A shop id, 'SPLIT' (equally over active shops) or 'BRANCH'
    chargeTo: z.string({required_error: 'Choose who the expense is charged to'}).min(1),
    paidFrom: z.enum(Object.keys(PAID_FROM) as [keyof typeof PAID_FROM], {
        errorMap: () => ({message: 'Choose where it was paid from'}),
    }),
    note: field({label: 'Note', kind: 'text', max: 300, required: false}),
});
export type AddExpensePayload = z.infer<typeof addExpenseSchema>;

const round2 = (v: number) => Math.round(v * 100) / 100;

class BranchExpenseService {
    private shopsOf(scope: BranchScope) {
        return prisma.shop.findMany({
            where: {branchId: scope.branchId, companyId: scope.companyId, deletedAt: null},
            select: {id: true, name: true, status: true},
            orderBy: {name: 'asc'},
        });
    }

    public async getExpenses(scope: BranchScope) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const [shops, expenses] = await Promise.all([
            this.shopsOf(scope),
            prisma.expense.findMany({
                where: {branchId: scope.branchId, companyId: scope.companyId, expenseDate: {gte: monthStart}},
                select: {category: true, amount: true, shopId: true},
            }),
        ]);

        const heads = new Map<string, {byShop: Record<string, number>; branch: number; total: number}>();
        for (const e of expenses) {
            const row = heads.get(e.category) ?? {byShop: {}, branch: 0, total: 0};
            if (e.shopId) row.byShop[e.shopId] = round2((row.byShop[e.shopId] ?? 0) + e.amount);
            else row.branch = round2(row.branch + e.amount);
            row.total = round2(row.total + e.amount);
            heads.set(e.category, row);
        }
        const rows = [...heads.entries()]
            .map(([head, r]) => ({head, ...r}))
            .sort((a, b) => b.total - a.total);

        const sumHead = (match: RegExp) =>
            round2(rows.filter((r) => match.test(r.head)).reduce((t, r) => t + r.total, 0));
        const thisMonth = round2(rows.reduce((t, r) => t + r.total, 0));
        const salaries = sumHead(/salar/i);
        const rent = sumHead(/rent/i);
        const month = now.toLocaleDateString('en-IN', {month: 'short'});

        const totalRow = {
            head: 'Total',
            byShop: Object.fromEntries(
                shops.map((s) => [s.id, round2(rows.reduce((t, r) => t + (r.byShop[s.id] ?? 0), 0))]),
            ),
            branch: round2(rows.reduce((t, r) => t + r.branch, 0)),
            total: thisMonth,
        };

        return {
            month,
            shops: shops.map((s) => ({id: s.id, name: s.name})),
            summary: {
                thisMonth,
                thisMonthSub: `Branch + ${shops.length} shop${shops.length === 1 ? '' : 's'}`,
                salaries,
                rent,
                other: round2(thisMonth - salaries - rent),
            },
            rows,
            totalRow,
        };
    }

    public async addExpense(scope: BranchScope, actorId: string, payload: AddExpensePayload) {
        const shops = (await this.shopsOf(scope)).filter((s) => s.status === 'ACTIVE');
        let shares: {shopId: string | null; amount: number}[];

        if (payload.chargeTo === 'BRANCH') {
            shares = [{shopId: null, amount: payload.amount}];
        } else if (payload.chargeTo === 'SPLIT') {
            if (!shops.length) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'This branch has no active shops to split between');
            }
            // Equal shares; the paisa left over goes to the first shop
            const each = Math.floor((payload.amount / shops.length) * 100) / 100;
            shares = shops.map((s, i) => ({
                shopId: s.id,
                amount: i === 0 ? round2(payload.amount - each * (shops.length - 1)) : each,
            }));
        } else {
            const shop = shops.find((s) => s.id === payload.chargeTo);
            if (!shop) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Choose an active shop of this branch', [
                    {field: 'chargeTo', message: 'Choose an active shop of this branch'},
                ]);
            }
            shares = [{shopId: shop.id, amount: payload.amount}];
        }

        const notes = [`Paid from ${PAID_FROM[payload.paidFrom]}`, payload.note].filter(Boolean).join(' · ');
        await prisma.expense.createMany({
            data: shares.map((s) => ({
                companyId: scope.companyId,
                branchId: scope.branchId,
                shopId: s.shopId,
                expenseDate: new Date(payload.date),
                category: payload.head,
                amount: s.amount,
                // Not CASH: branch payments do not come out of a shop's drawer
                mode: `BRANCH_${payload.paidFrom}`,
                notes,
                createdById: actorId,
            })),
        });

        return {success: true, message: `Expense of ₹${payload.amount.toLocaleString('en-IN')} added`};
    }
}

export default new BranchExpenseService();
