import {BillStatus, Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {BranchScope} from './customerDue.service';
import shopGstService from './shopGst.service';
import companySettingsService from './companySettings.service';
import {rateFor} from '../utils/gst';

/*
 * Products & Prices for the branch: the real products of the branch's shops,
 * their selling price, average purchase cost (from confirmed purchase bills),
 * margin and stock. View only (D-13): each shop sets its own prices.
 */

export const priceQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    categoryId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    tab: z.enum(['ALL', 'CHANGED_THIS_WEEK', 'BELOW_MIN_MARGIN']).default('ALL'),
});

type PriceQuery = z.infer<typeof priceQuerySchema>;
const round2 = (v: number) => Math.round(v * 100) / 100;

class BranchPricingService {
    private productWhere(scope: BranchScope, extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
        return {
            companyId: scope.companyId,
            deletedAt: null,
            shop: {branchId: scope.branchId, deletedAt: null},
            ...extra,
        };
    }

    public async list(scope: BranchScope, query: PriceQuery) {
        // Below this margin a product is flagged (the company's setting, P4-08)
        const {minMarginPct: MIN_MARGIN_PCT} = await companySettingsService.get(scope.companyId);
        const weekAgo = new Date(Date.now() - 7 * 86_400_000);
        const products = await prisma.product.findMany({
            where: this.productWhere(scope, {
                ...(query.categoryId ? {categoryId: query.categoryId} : {}),
                ...(query.search
                    ? {
                          OR: [
                              {name: {contains: query.search, mode: 'insensitive'}},
                              {sku: {contains: query.search, mode: 'insensitive'}},
                          ],
                      }
                    : {}),
            }),
            orderBy: {name: 'asc'},
            select: {
                id: true,
                name: true,
                sku: true,
                mrp: true,
                sellingPrice: true,
                taxRate: true,
                priceChangedAt: true,
                category: {select: {id: true, name: true}},
                shop: {select: {id: true, name: true}},
                variants: {
                    where: {isActive: true},
                    select: {inventories: {where: {branchId: scope.branchId}, select: {physicalQty: true}}},
                },
            },
        });

        // Weighted average purchase cost per product
        const lines = await prisma.purchaseBillItem.findMany({
            where: {
                productId: {in: products.map((p) => p.id)},
                bill: {branchId: scope.branchId, status: BillStatus.CONFIRMED, deletedAt: null},
            },
            select: {productId: true, quantity: true, unitCost: true},
        });
        const bought = new Map<string, {qty: number; value: number}>();
        for (const l of lines) {
            const b = bought.get(l.productId) ?? {qty: 0, value: 0};
            bought.set(l.productId, {qty: b.qty + l.quantity, value: b.value + l.quantity * l.unitCost});
        }
        const avgCost = new Map(
            [...bought].filter(([, b]) => b.qty > 0).map(([id, b]) => [id, round2(b.value / b.qty)]),
        );

        // GST at the shop price: the product's fixed rate, or its shop's price rule (D-18)
        const ruleOf = await shopGstService.rulesOf(products.map((p) => p.shop?.id));
        const rows = products.map((p) => {
            const branchPrice = p.sellingPrice || p.mrp;
            const cost = avgCost.get(p.id) ?? null;
            const margin = cost !== null && branchPrice > 0 ? round2(((branchPrice - cost) / branchPrice) * 100) : null;
            return {
                id: p.id,
                name: p.name,
                code: p.sku,
                category: p.category?.name ?? '—',
                categoryId: p.category?.id ?? null,
                shop: p.shop,
                taxRate: rateFor(ruleOf(p.shop?.id), p.taxRate, branchPrice),
                avgCost: cost,
                mrp: p.mrp,
                branchPrice,
                margin,
                stock: p.variants.reduce((t, v) => t + v.inventories.reduce((s, i) => s + i.physicalQty, 0), 0),
                priceChangedAt: p.priceChangedAt,
            };
        });

        const changed = (r: (typeof rows)[number]) => !!r.priceChangedAt && r.priceChangedAt >= weekAgo;
        const lowMargin = (r: (typeof rows)[number]) => r.margin !== null && r.margin < MIN_MARGIN_PCT;
        const items =
            query.tab === 'CHANGED_THIS_WEEK'
                ? rows.filter(changed)
                : query.tab === 'BELOW_MIN_MARGIN'
                  ? rows.filter(lowMargin)
                  : rows;

        const categories = [
            ...new Map(rows.filter((r) => r.categoryId).map((r) => [r.categoryId!, r.category])).entries(),
        ]
            .map(([id, name]) => ({id, name}))
            .sort((a, b) => a.name.localeCompare(b.name));

        return {
            items,
            counts: {all: rows.length, changedThisWeek: rows.filter(changed).length, belowMinMargin: rows.filter(lowMargin).length},
            categories,
            minMargin: MIN_MARGIN_PCT,
        };
    }
}

export default new BranchPricingService();
