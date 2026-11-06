import httpStatus from 'http-status';
import {BillStatus, Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';

export type BranchScope = {companyId: string; branchId: string};

/*
 * Customer dues across the branch's shops, from the real shop customers
 * (their balance is kept up to date by every sales bill and credit receipt)
 * and the open credit bills behind it.
 */

export const customerDueQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    tab: z.enum(['WITH_DUE', 'OVERDUE', 'OVER_LIMIT', 'ALL']).default('WITH_DUE'),
    shopId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(1000).default(10),
});
export type CustomerDueQuery = z.infer<typeof customerDueQuerySchema>;

export const updateLimitSchema = z.object({
    creditLimit: z.coerce.number({invalid_type_error: 'Enter a valid credit limit'}).min(0, 'Credit limit cannot be negative').max(10_000_000),
    creditDays: z.coerce.number({invalid_type_error: 'Enter valid credit days'}).int().min(0).max(365),
});

const round2 = (v: number) => Math.round(v * 100) / 100;
const DAY = 86_400_000;

class CustomerDueService {
    private base(scope: BranchScope): Prisma.ShopCustomerWhereInput {
        return {companyId: scope.companyId, branchId: scope.branchId, isActive: true};
    }

    /** Due per customer split by age: bills up to 30 days old vs older */
    private async aging(scope: BranchScope, customers: {shopId: string; mobile: string}[]) {
        if (!customers.length) return new Map<string, {recent: number; old: number; oldest: Date | null}>();
        const bills = await prisma.salesBill.findMany({
            where: {
                branchId: scope.branchId,
                status: BillStatus.CONFIRMED,
                deletedAt: null,
                balanceDue: {gt: 0},
                customerPhone: {in: [...new Set(customers.map((c) => c.mobile))]},
            },
            select: {shopId: true, customerPhone: true, balanceDue: true, billDate: true},
        });
        const map = new Map<string, {recent: number; old: number; oldest: Date | null}>();
        const cutoff = Date.now() - 30 * DAY;
        for (const b of bills) {
            const key = `${b.shopId}:${b.customerPhone}`;
            const a = map.get(key) ?? {recent: 0, old: 0, oldest: null};
            if (b.billDate.getTime() < cutoff) a.old = round2(a.old + b.balanceDue);
            else a.recent = round2(a.recent + b.balanceDue);
            if (!a.oldest || b.billDate < a.oldest) a.oldest = b.billDate;
            map.set(key, a);
        }
        return map;
    }

    private async rows(scope: BranchScope, where: Prisma.ShopCustomerWhereInput) {
        const customers = await prisma.shopCustomer.findMany({
            where,
            include: {shop: {select: {name: true}}},
            orderBy: {balanceDue: 'desc'},
        });
        const aging = await this.aging(scope, customers);
        return customers.map((c) => {
            const a = aging.get(`${c.shopId}:${c.mobile}`);
            // Due not on any open bill (e.g. the opening due) counts as old
            const onBills = (a?.recent ?? 0) + (a?.old ?? 0);
            const due30Plus = round2((a?.old ?? 0) + Math.max(0, c.balanceDue - onBills));
            const overdue =
                c.balanceDue > 0 &&
                ((a?.oldest && a.oldest.getTime() < Date.now() - c.creditDays * DAY) ||
                    (!a?.oldest && c.balanceDue > 0));
            return {
                id: c.id,
                name: c.businessName || c.name,
                phone: c.mobile,
                customerType: c.customerType === 'B2B' ? 'B2B' : 'B2C',
                gstin: c.gstin,
                shopId: c.shopId,
                shopName: c.shop.name,
                creditLimit: c.creditLimit,
                creditDays: c.creditDays,
                due0To30: round2(Math.min(a?.recent ?? 0, c.balanceDue)),
                due30Plus,
                totalDue: c.balanceDue,
                isOverdue: !!overdue,
                isOverLimit: c.creditLimit > 0 && c.balanceDue > c.creditLimit,
                createdAt: c.createdAt,
            };
        });
    }

    public async list(scope: BranchScope, query: CustomerDueQuery) {
        const where: Prisma.ShopCustomerWhereInput = {
            ...this.base(scope),
            ...(query.shopId ? {shopId: query.shopId} : {}),
            ...(query.tab !== 'ALL' ? {balanceDue: {gt: 0}} : {}),
            ...(query.search
                ? {
                      OR: [
                          {name: {contains: query.search, mode: 'insensitive'}},
                          {businessName: {contains: query.search, mode: 'insensitive'}},
                          {mobile: {contains: query.search}},
                      ],
                  }
                : {}),
        };
        let rows = await this.rows(scope, where);
        if (query.tab === 'OVERDUE') rows = rows.filter((r) => r.isOverdue);
        if (query.tab === 'OVER_LIMIT') rows = rows.filter((r) => r.isOverLimit);

        const total = rows.length;
        const start = (query.page - 1) * query.limit;
        return {
            items: rows.slice(start, start + query.limit),
            pagination: {total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) || 1},
        };
    }

    public async summary(scope: BranchScope) {
        const rows = await this.rows(scope, {...this.base(scope), balanceDue: {gt: 0}});
        const byShop = new Map<string, {shopName: string; amount: number; customerCount: number}>();
        for (const r of rows) {
            const s = byShop.get(r.shopName) ?? {shopName: r.shopName, amount: 0, customerCount: 0};
            byShop.set(r.shopName, {...s, amount: round2(s.amount + r.totalDue), customerCount: s.customerCount + 1});
        }
        const old = rows.filter((r) => r.due30Plus > 0);
        return {
            totalDue: round2(rows.reduce((t, r) => t + r.totalDue, 0)),
            customerCount: rows.length,
            shopBreakdown: [...byShop.values()].sort((a, b) => b.amount - a.amount),
            over30DaysDue: round2(old.reduce((t, r) => t + r.due30Plus, 0)),
            over30DaysCount: old.length,
            overdueCount: rows.filter((r) => r.isOverdue).length,
            overLimitCount: rows.filter((r) => r.isOverLimit).length,
        };
    }

    public async get(scope: BranchScope, id: string) {
        const [row] = await this.rows(scope, {...this.base(scope), id});
        if (!row) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
        return row;
    }

    public async updateLimit(scope: BranchScope, id: string, data: z.infer<typeof updateLimitSchema>) {
        const {count} = await prisma.shopCustomer.updateMany({where: {...this.base(scope), id}, data});
        if (!count) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
        return this.get(scope, id);
    }

    /** WhatsApp messages for customers with dues older than 30 days (or the chosen ones) */
    public async reminders(scope: BranchScope, customerIds?: string[]) {
        const rows = await this.rows(scope, {
            ...this.base(scope),
            balanceDue: {gt: 0},
            ...(customerIds?.length ? {id: {in: customerIds}} : {}),
        });
        const due = customerIds?.length ? rows : rows.filter((r) => r.due30Plus > 0);
        return {
            reminders: due.map((r) => {
                const text = `Namaste ${r.name}, a friendly reminder from ${r.shopName}: ₹${r.totalDue.toLocaleString('en-IN')} is due on your account. Thank you!`;
                return {
                    id: r.id,
                    name: r.name,
                    phone: r.phone,
                    amount: r.totalDue,
                    link: `https://wa.me/91${r.phone}?text=${encodeURIComponent(text)}`,
                };
            }),
        };
    }

    public async export(scope: BranchScope, query: CustomerDueQuery) {
        return (await this.list(scope, {...query, page: 1, limit: 1000})).items;
    }
}

export default new CustomerDueService();
