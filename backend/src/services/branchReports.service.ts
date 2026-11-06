import {BillStatus, CreditNoteStatus} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {BranchScope} from './customerDue.service';

/*
 * Branch profit & loss for a date range, worked out from the real records:
 *
 *   Net sales     confirmed sales bills (without GST) less approved returns
 *   Cost of goods units sold x average purchase cost of that item in the branch
 *   Gross profit  net sales - cost of goods
 *   Expenses      shop expenses, and branch expenses not charged to a shop
 *   Net profit    gross profit - expenses
 */

const day = (s: string) => new Date(`${s}T00:00:00`);
const ymd = (d: Date) => d.toLocaleDateString('en-CA');

export const pnlQuerySchema = z
    .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid From date').optional(),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid To date').optional(),
    })
    .transform((v) => {
        const now = new Date();
        return {
            from: v.from ?? ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
            to: v.to ?? ymd(now),
        };
    })
    .refine((v) => v.to >= v.from, {message: 'To date cannot be before From date', path: ['to']});

export type PnlRow = {
    line: string;
    byShop: Record<string, number>;
    branch: number;
    total: number;
    isNegative?: boolean;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

class BranchReportsService {
    /** With shopId (a shop login), only that shop and its own expenses */
    public async getPnl(scope: BranchScope & {shopId?: string}, range: {from: string; to: string}) {
        const gte = day(range.from);
        const lt = new Date(day(range.to).getTime() + 86_400_000);
        const inBranch = {companyId: scope.companyId, branchId: scope.branchId};
        const own = scope.shopId ? {shopId: scope.shopId} : {};

        const [shops, bills, notes, expenses, purchases] = await Promise.all([
            prisma.shop.findMany({
                where: {branchId: scope.branchId, deletedAt: null, ...(scope.shopId ? {id: scope.shopId} : {})},
                select: {id: true, name: true},
                orderBy: {name: 'asc'},
            }),
            prisma.salesBill.findMany({
                where: {...inBranch, ...own, status: BillStatus.CONFIRMED, deletedAt: null, billDate: {gte, lt}},
                select: {
                    shopId: true,
                    totalAmount: true,
                    taxAmount: true,
                    items: {select: {variantId: true, quantity: true}},
                },
            }),
            prisma.creditNote.findMany({
                where: {...inBranch, ...own, status: CreditNoteStatus.APPROVED, createdAt: {gte, lt}},
                select: {shopId: true, taxableAmount: true, items: {select: {variantId: true, quantity: true}}},
            }),
            prisma.expense.findMany({
                where: {...inBranch, ...(scope.shopId ? {shopId: scope.shopId} : {}), expenseDate: {gte, lt}},
                select: {shopId: true, amount: true},
            }),
            // Every confirmed purchase so far gives the average cost of each item
            prisma.purchaseBillItem.findMany({
                where: {bill: {...inBranch, status: BillStatus.CONFIRMED, deletedAt: null, billDate: {lt}}},
                select: {variantId: true, quantity: true, unitCost: true},
            }),
        ]);

        const bought = new Map<string, {qty: number; value: number}>();
        for (const p of purchases) {
            const b = bought.get(p.variantId) ?? {qty: 0, value: 0};
            bought.set(p.variantId, {qty: b.qty + p.quantity, value: b.value + p.quantity * p.unitCost});
        }
        let unknownCost = 0;
        const costOf = (variantId: string, qty: number) => {
            const b = bought.get(variantId);
            if (!b?.qty) {
                unknownCost += qty;
                return 0;
            }
            return (b.value / b.qty) * qty;
        };

        const zero = () => Object.fromEntries(shops.map((s) => [s.id, 0])) as Record<string, number>;
        const sales = zero();
        const cogs = zero();
        const spend = zero();
        let branchSpend = 0;

        for (const b of bills) {
            sales[b.shopId] = (sales[b.shopId] ?? 0) + b.totalAmount - b.taxAmount;
            for (const i of b.items) cogs[b.shopId] = (cogs[b.shopId] ?? 0) + costOf(i.variantId, i.quantity);
        }
        for (const n of notes) {
            sales[n.shopId] = (sales[n.shopId] ?? 0) - n.taxableAmount;
            for (const i of n.items) cogs[n.shopId] = (cogs[n.shopId] ?? 0) - costOf(i.variantId, i.quantity);
        }
        for (const e of expenses) {
            if (e.shopId) spend[e.shopId] = (spend[e.shopId] ?? 0) + e.amount;
            else branchSpend += e.amount;
        }

        const row = (line: string, byShop: Record<string, number>, branch = 0, isNegative = false): PnlRow => {
            const rounded = Object.fromEntries(Object.entries(byShop).map(([k, v]) => [k, round2(v)]));
            return {
                line,
                byShop: rounded,
                branch: round2(branch),
                total: round2(Object.values(byShop).reduce((t, v) => t + v, 0) + branch),
                isNegative,
            };
        };
        const minus = (a: Record<string, number>, b: Record<string, number>) =>
            Object.fromEntries(shops.map((s) => [s.id, (a[s.id] ?? 0) - (b[s.id] ?? 0)]));

        const gross = minus(sales, cogs);
        const net = minus(gross, spend);
        const rows: PnlRow[] = [
            row('Net sales (without GST)', sales),
            row('Cost of goods sold', Object.fromEntries(Object.entries(cogs).map(([k, v]) => [k, -v])), 0, true),
            row('Gross profit', gross),
            row('Expenses', Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, -v])), -branchSpend, true),
            row('Net profit', net, -branchSpend),
        ];

        const fmt = (s: string) =>
            day(s).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
        return {
            period: range.from === range.to ? fmt(range.from) : `${fmt(range.from)} – ${fmt(range.to)}`,
            range,
            shops,
            rows,
            margins: shops.map((s) => ({
                shop: s.name,
                margin: sales[s.id] > 0 ? round2((gross[s.id] / sales[s.id]) * 100) : null,
            })),
            note: unknownCost
                ? `${unknownCost} unit(s) sold have no purchase bill, so their cost is counted as ₹0 and profit looks higher.`
                : null,
        };
    }
}

export default new BranchReportsService();
