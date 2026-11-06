import httpStatus from 'http-status';
import {BillStatus, Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {BranchScope} from './customerDue.service';

/*
 * Products & Prices for the branch: the real products of the branch's shops,
 * their selling price, average purchase cost (from confirmed purchase bills),
 * margin and stock. Saving changes the product's selling price, which is what
 * the POS bills at.
 */

/** Below this margin a product is flagged */
export const MIN_MARGIN_PCT = 25;

export const priceQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    categoryId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    tab: z.enum(['ALL', 'CHANGED_THIS_WEEK', 'BELOW_MIN_MARGIN']).default('ALL'),
});

const price = z.coerce
    .number({invalid_type_error: 'Enter a valid price'})
    .positive('Price must be more than 0')
    .max(10_000_000)
    .transform((v) => Math.round(v * 100) / 100);

export const savePricesSchema = z.object({
    prices: z
        .record(z.string().uuid(), price)
        .refine((p) => Object.keys(p).length > 0, 'Change at least one price')
        .refine((p) => Object.keys(p).length <= 500, 'At most 500 prices at a time'),
});

export const bulkPriceSchema = z
    .object({
        // Empty = every product of the branch
        categoryId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
        changeType: z.enum(['PERCENT_OFF_MRP', 'FLAT_OFF_MRP'], {
            errorMap: () => ({message: 'Choose how to change the price'}),
        }),
        value: z.coerce.number({invalid_type_error: 'Enter a valid value'}).positive('Value must be more than 0'),
    })
    .refine((v) => v.changeType !== 'PERCENT_OFF_MRP' || v.value < 100, {
        message: 'Discount must be less than 100%',
        path: ['value'],
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
                taxRate: p.taxRate,
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

    /** Sets the selling price on the product and its variants (the POS bills at the variant price) */
    private async setPrice(tx: Prisma.TransactionClient, productId: string, sellingPrice: number) {
        const now = new Date();
        await tx.product.update({where: {id: productId}, data: {sellingPrice, priceChangedAt: now}});
        await tx.productVariant.updateMany({where: {productId}, data: {sellingPrice}});
    }

    public async savePrices(scope: BranchScope, prices: Record<string, number>) {
        const ids = Object.keys(prices);
        const products = await prisma.product.findMany({
            where: this.productWhere(scope, {id: {in: ids}}),
            select: {id: true, name: true, mrp: true},
        });
        if (products.length !== ids.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Some products are not in this branch');
        }
        const tooHigh = products.find((p) => prices[p.id] > p.mrp);
        if (tooHigh) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Price of ${tooHigh.name} cannot be more than its MRP (₹${tooHigh.mrp})`,
            );
        }
        await prisma.$transaction(async (tx) => {
            for (const p of products) await this.setPrice(tx, p.id, prices[p.id]);
        });
        return {success: true, message: `${products.length} price${products.length === 1 ? '' : 's'} updated`};
    }

    public async applyBulkPrice(scope: BranchScope, data: z.infer<typeof bulkPriceSchema>) {
        const products = await prisma.product.findMany({
            where: this.productWhere(scope, data.categoryId ? {categoryId: data.categoryId} : {}),
            select: {id: true, mrp: true},
        });
        if (!products.length) throw new ApiError(httpStatus.BAD_REQUEST, 'No products to change');
        await prisma.$transaction(async (tx) => {
            for (const p of products) {
                const next =
                    data.changeType === 'PERCENT_OFF_MRP'
                        ? round2(p.mrp * (1 - data.value / 100))
                        : round2(p.mrp - data.value);
                // Never below ₹1 or above MRP
                await this.setPrice(tx, p.id, Math.min(p.mrp, Math.max(1, next)));
            }
        });
        return {success: true, message: `New price applied to ${products.length} product${products.length === 1 ? '' : 's'}`};
    }
}

export default new BranchPricingService();
