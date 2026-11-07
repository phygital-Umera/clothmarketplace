import httpStatus from 'http-status';
import {BillStatus, OrderStatus, Prisma, ProductStatus} from '@prisma/client';
import {z} from 'zod';
import prisma from '../../client';
import ApiError from '@utils/ApiError';

/*
 * Customer storefront catalog (public, no sign-in).
 *
 * Only PUBLISHED products of an ACTIVE shop of an ACTIVE company are shown.
 * Stock is the shop's branch inventory (physical - reserved) of each variant.
 * The catalog is small enough to filter, facet and sort in memory after one
 * query, which keeps the facet counts exact.
 */

const round2 = (v: number) => Math.round(v * 100) / 100;
const DAY = 86_400_000;

export const SORTS = ['popular', 'new', 'price_asc', 'price_desc', 'discount', 'rating'] as const;

const csv = z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) =>
        (Array.isArray(v) ? v : (v ?? '').split(','))
            .map((s) => s.trim())
            .filter(Boolean),
    );

export const productQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    gender: z.enum(['WOMEN', 'MEN', 'KIDS']).optional(),
    category: csv,
    subcategory: csv,
    brand: csv,
    size: csv,
    color: csv,
    fabric: csv,
    priceMin: z.coerce.number().min(0).optional(),
    priceMax: z.coerce.number().min(0).optional(),
    minDiscount: z.coerce.number().min(0).max(90).optional(),
    inStock: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
    newOnly: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
    sort: z.enum(SORTS).default('popular'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(60).default(20),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

const LISTED: Prisma.ProductWhereInput = {
    status: ProductStatus.PUBLISHED,
    deletedAt: null,
    shop: {status: 'ACTIVE', deletedAt: null},
    company: {status: 'ACTIVE', deletedAt: null},
};

const CARD_SELECT = {
    id: true,
    slug: true,
    name: true,
    shortDesc: true,
    mrp: true,
    sellingPrice: true,
    gender: true,
    fabric: true,
    tags: true,
    createdAt: true,
    companyId: true,
    brand: {select: {name: true}},
    category: {select: {name: true}},
    subcategory: {select: {name: true}},
    shop: {select: {id: true, name: true, branchId: true, branch: {select: {city: true}}}},
    images: {orderBy: [{isMain: 'desc' as const}, {order: 'asc' as const}], take: 1, select: {url: true}},
    variants: {
        where: {isActive: true},
        select: {
            id: true,
            size: true,
            color: true,
            colorHex: true,
            image: true,
            mrp: true,
            sellingPrice: true,
            inventories: {select: {branchId: true, physicalQty: true, reservedQty: true}},
        },
    },
} satisfies Prisma.ProductSelect;

type Row = Prisma.ProductGetPayload<{select: typeof CARD_SELECT}>;

/**
 * Card photo: the product's own photo, unless every colour on sale has its own
 * colour photo (e.g. a white sample shirt sold only in black and red); then the
 * photo of the first colour in stock, so the card shows a colour you can buy.
 */
const cardImage = (p: Row, branchId: string) => {
    const own = p.images[0]?.url ?? null;
    const colours = [...new Set(p.variants.map((v) => v.color.toLowerCase()))];
    const photoOf = (c: string) => p.variants.find((v) => v.color.toLowerCase() === c && v.image)?.image;
    if (!colours.length || !colours.every((c) => photoOf(c))) return own;
    const inStock = p.variants.find((v) => v.image && stockOf(v, branchId) > 0);
    return inStock?.image ?? photoOf(colours[0]) ?? own;
};

/** Size order for display: XS < S < M < L < XL < XXL, then numbers, then others */
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'FREE'];
export const sortSizes = (sizes: string[]) =>
    [...sizes].sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(a.toUpperCase());
        const ib = SIZE_ORDER.indexOf(b.toUpperCase());
        if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        const na = parseFloat(a);
        const nb = parseFloat(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b);
    });

export const stockOf = (
    v: {inventories: {branchId: string; physicalQty: number; reservedQty: number}[]},
    branchId: string,
) => {
    const inv = v.inventories.find((i) => i.branchId === branchId);
    return inv ? Math.max(0, inv.physicalQty - inv.reservedQty) : 0;
};

class CatalogService {
    /** Ratings and units sold per product, for cards and sorting */
    private async stats(productIds: string[]) {
        if (!productIds.length) return {rating: new Map(), sold: new Map()};
        const [ratings, ordered, billed] = await Promise.all([
            prisma.productReview.groupBy({
                by: ['productId'],
                where: {productId: {in: productIds}},
                _avg: {rating: true},
                _count: true,
            }),
            prisma.orderItem.groupBy({
                by: ['productId'],
                where: {productId: {in: productIds}, order: {status: {not: OrderStatus.CANCELLED}}},
                _sum: {quantity: true},
            }),
            prisma.salesBillItem.groupBy({
                by: ['productId'],
                where: {productId: {in: productIds}, bill: {status: BillStatus.CONFIRMED, deletedAt: null}},
                _sum: {quantity: true},
            }),
        ]);
        const rating = new Map<string, {avg: number; count: number}>(
            ratings.map((r) => [r.productId, {avg: round2(r._avg.rating ?? 0), count: r._count}]),
        );
        const sold = new Map<string, number>();
        for (const r of [...ordered, ...billed]) {
            sold.set(r.productId, (sold.get(r.productId) ?? 0) + (r._sum.quantity ?? 0));
        }
        return {rating, sold};
    }

    /** Card shape used everywhere on the store */
    private toCard(
        p: Row,
        stats: {rating: Map<string, {avg: number; count: number}>; sold: Map<string, number>},
        bestsellerIds: Set<string>,
    ) {
        const branchId = p.shop!.branchId;
        const stock = p.variants.reduce((t, v) => t + stockOf(v, branchId), 0);
        const prices = p.variants.map((v) => v.sellingPrice ?? p.sellingPrice ?? p.mrp);
        const price = prices.length ? Math.min(...prices) : p.sellingPrice || p.mrp;
        const mrp = p.mrp;
        const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        const colors = [...new Map(p.variants.map((v) => [v.color, v.colorHex ?? null])).entries()].map(
            ([name, hex]) => ({name, hex}),
        );
        const isNew = Date.now() - p.createdAt.getTime() < 21 * DAY;
        const badge = stock === 0 ? 'OUT_OF_STOCK' : bestsellerIds.has(p.id) ? 'BESTSELLER' : stock <= 3 ? 'LIMITED' : isNew ? 'NEW' : null;
        return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand?.name ?? p.shop!.name,
            category: p.category?.name ?? null,
            subcategory: p.subcategory?.name ?? null,
            gender: p.gender,
            image: cardImage(p, branchId),
            colors,
            price,
            mrp,
            discountPct,
            rating: stats.rating.get(p.id) ?? {avg: 0, count: 0},
            sold: stats.sold.get(p.id) ?? 0,
            inStock: stock > 0,
            stock,
            badge,
            createdAt: p.createdAt,
            sizes: sortSizes([...new Set(p.variants.map((v) => v.size))]),
            fabric: p.fabric,
            shop: {name: p.shop!.name, city: p.shop!.branch.city},
        };
    }

    private async cards(where: Prisma.ProductWhereInput) {
        const rows = await prisma.product.findMany({where: {...LISTED, ...where}, select: CARD_SELECT, take: 2000});
        const stats = await this.stats(rows.map((r) => r.id));
        // Bestsellers: the top tenth by units sold (at least 1 sold)
        const ranked = [...stats.sold.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
        const best = new Set(ranked.slice(0, Math.max(1, Math.ceil(rows.length / 10))).map(([id]) => id));
        return rows.map((r) => this.toCard(r, stats, best));
    }

    private genderWhere(gender?: 'WOMEN' | 'MEN' | 'KIDS'): Prisma.ProductWhereInput {
        if (!gender) return {};
        if (gender === 'KIDS') return {gender: {in: ['KIDS', 'BOYS', 'GIRLS']}};
        return {gender: {in: [gender, 'UNISEX']}};
    }

    public async listProducts(query: ProductQuery) {
        const lc = (a: string[]) => a.map((s) => s.toLowerCase());
        const [cats, subs, brands, sizes, colors, fabrics] = [
            lc(query.category),
            lc(query.subcategory),
            lc(query.brand),
            lc(query.size),
            lc(query.color),
            lc(query.fabric),
        ];
        // Words of the search; plurals match too ("sarees" -> "saree", "kurtis" -> "kurti")
        const words = (query.q ?? '')
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .filter((w) => w.length > 1)
            .slice(0, 6)
            .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));

        // Search and gender narrow the set the facets are counted on
        const base = (
            await this.cards({
                ...this.genderWhere(query.gender),
                // Every word must match somewhere: "mirror kurti" finds "Mirror-work Silk Kurti"
                ...(words.length
                    ? {
                          AND: words.map((w) => ({
                              OR: [
                                  {name: {contains: w, mode: 'insensitive' as const}},
                                  {tags: {has: w}},
                                  {category: {name: {contains: w, mode: 'insensitive' as const}}},
                                  {subcategory: {name: {contains: w, mode: 'insensitive' as const}}},
                                  {brand: {name: {contains: w, mode: 'insensitive' as const}}},
                                  {fabric: {contains: w, mode: 'insensitive' as const}},
                                  {variants: {some: {isActive: true, color: {contains: w, mode: 'insensitive' as const}}}},
                              ],
                          })),
                      }
                    : {}),
            })
        ).filter((c) => !query.newOnly || Date.now() - c.createdAt.getTime() < 30 * DAY);

        const matches = (c: (typeof base)[number], skip?: string) =>
            (skip === 'category' || !cats.length || cats.includes((c.category ?? '').toLowerCase())) &&
            (skip === 'subcategory' || !subs.length || subs.includes((c.subcategory ?? '').toLowerCase())) &&
            (skip === 'brand' || !brands.length || brands.includes(c.brand.toLowerCase())) &&
            (skip === 'size' || !sizes.length || c.sizes.some((s) => sizes.includes(s.toLowerCase()))) &&
            (skip === 'color' || !colors.length || c.colors.some((x) => colors.includes(x.name.toLowerCase()))) &&
            (skip === 'fabric' || !fabrics.length || fabrics.includes((c.fabric ?? '').toLowerCase())) &&
            (skip === 'price' ||
                ((query.priceMin === undefined || c.price >= query.priceMin) &&
                    (query.priceMax === undefined || c.price <= query.priceMax))) &&
            (query.minDiscount === undefined || c.discountPct >= query.minDiscount) &&
            (!query.inStock || c.inStock);

        const items = base.filter((c) => matches(c));

        // Each facet counts with every other filter applied (but not itself)
        const count = (skip: string, keys: (c: (typeof base)[number]) => string[]) => {
            const m = new Map<string, number>();
            for (const c of base.filter((x) => matches(x, skip))) {
                for (const k of new Set(keys(c).filter(Boolean))) m.set(k, (m.get(k) ?? 0) + 1);
            }
            return [...m.entries()].map(([value, n]) => ({value, count: n}));
        };
        const colorHex = new Map(base.flatMap((c) => c.colors.map((x) => [x.name, x.hex] as const)));
        const priceBase = base.filter((x) => matches(x, 'price')).map((c) => c.price);

        const sorters: Record<(typeof SORTS)[number], (a: (typeof base)[number], b: (typeof base)[number]) => number> = {
            popular: (a, b) => b.sold - a.sold || b.rating.count - a.rating.count,
            new: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            price_asc: (a, b) => a.price - b.price,
            price_desc: (a, b) => b.price - a.price,
            discount: (a, b) => b.discountPct - a.discountPct,
            rating: (a, b) => b.rating.avg - a.rating.avg || b.rating.count - a.rating.count,
        };
        // In-stock first, then the chosen order
        items.sort((a, b) => Number(b.inStock) - Number(a.inStock) || sorters[query.sort](a, b));

        const total = items.length;
        const start = (query.page - 1) * query.limit;
        return {
            items: items.slice(start, start + query.limit),
            pagination: {total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) || 1},
            facets: {
                categories: count('category', (c) => [c.category ?? '']).sort((a, b) => b.count - a.count),
                subcategories: count('subcategory', (c) => [c.subcategory ?? '']).sort((a, b) => b.count - a.count),
                brands: count('brand', (c) => [c.brand]).sort((a, b) => a.value.localeCompare(b.value)),
                sizes: (() => {
                    const list = count('size', (c) => c.sizes);
                    const order = sortSizes(list.map((x) => x.value));
                    return order.map((v) => list.find((x) => x.value === v)!);
                })(),
                colors: count('color', (c) => c.colors.map((x) => x.name))
                    .map((x) => ({...x, hex: colorHex.get(x.value) ?? null}))
                    .sort((a, b) => b.count - a.count),
                fabrics: count('fabric', (c) => [c.fabric ?? '']).sort((a, b) => b.count - a.count),
                price: {min: priceBase.length ? Math.floor(Math.min(...priceBase)) : 0, max: priceBase.length ? Math.ceil(Math.max(...priceBase)) : 0},
            },
        };
    }

    public async getProduct(idOrSlug: string) {
        const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
        const p = await prisma.product.findFirst({
            where: {...LISTED, ...(isUuid ? {id: idOrSlug} : {slug: idOrSlug})},
            include: {
                brand: {select: {name: true}},
                category: {select: {name: true}},
                subcategory: {select: {name: true}},
                shop: {select: {id: true, name: true, branchId: true, branch: {select: {city: true}}}},
                images: {orderBy: [{isMain: 'desc'}, {order: 'asc'}], select: {id: true, url: true, altText: true, cleanedFromId: true}},
                variants: {
                    where: {isActive: true},
                    select: {
                        id: true,
                        variantSku: true,
                        size: true,
                        color: true,
                        colorHex: true,
                        image: true,
                        mrp: true,
                        sellingPrice: true,
                        inventories: {select: {branchId: true, physicalQty: true, reservedQty: true}},
                    },
                },
                reviews: {
                    orderBy: {createdAt: 'desc'},
                    take: 20,
                    select: {id: true, rating: true, title: true, comment: true, fit: true, images: true, createdAt: true, user: {select: {fullname: true}}},
                },
            },
        });
        if (!p) throw new ApiError(httpStatus.NOT_FOUND, 'This product is not available');

        const branchId = p.shop!.branchId;
        const variants = p.variants.map((v) => {
            const price = v.sellingPrice ?? p.sellingPrice ?? p.mrp;
            const mrp = v.mrp ?? p.mrp;
            return {
                id: v.id,
                sku: v.variantSku,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                image: v.image,
                price,
                mrp,
                discountPct: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
                stock: stockOf(v, branchId),
            };
        });

        const agg = await prisma.productReview.groupBy({by: ['rating'], where: {productId: p.id}, _count: true});

        // Coupons the buyer can use on this product: made by its company (Company Admin →
        // Promotions), for all shops or for this shop / branch; same rules as at checkout
        const now = new Date();
        const offers = (
            await prisma.coupon.findMany({
                where: {
                    isActive: true,
                    startDate: {lte: now},
                    endDate: {gte: now},
                    AND: [
                        {OR: [{companyId: null}, {companyId: p.companyId}]},
                        {OR: [{shopId: null}, {shopId: p.shopId}]},
                        {OR: [{branchId: null}, {branchId}]},
                    ],
                },
                orderBy: {discountValue: 'desc'},
                take: 6,
                select: {code: true, name: true, description: true, type: true, discountValue: true, minPurchaseAmount: true, maxDiscountLimit: true, endDate: true, usageLimit: true, usedCount: true},
            })
        )
            .filter((c) => c.usageLimit === null || c.usedCount < c.usageLimit)
            .slice(0, 3)
            .map(({usageLimit, usedCount, ...c}) => c);
        const reviewCount = agg.reduce((t, r) => t + r._count, 0);
        const avg = reviewCount ? round2(agg.reduce((t, r) => t + r.rating * r._count, 0) / reviewCount) : 0;

        const similar = (
            await this.cards({
                id: {not: p.id},
                OR: [{subcategoryId: p.subcategoryId ?? undefined}, {categoryId: p.categoryId ?? undefined}],
            })
        )
            .sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.sold - a.sold)
            .slice(0, 8);

        return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand?.name ?? p.shop!.name,
            category: p.category?.name ?? null,
            subcategory: p.subcategory?.name ?? null,
            gender: p.gender,
            shortDesc: p.shortDesc,
            description: p.detailedDesc,
            attributes: {
                fabric: p.fabric,
                pattern: p.pattern,
                fit: p.fit,
                sleeveType: p.sleeveType,
                neckType: p.neckType,
                occasion: p.occasion,
                productType: p.productType,
            },
            careInstructions: p.careInstructions,
            returnEligible: p.returnEligible,
            returnPeriodDays: p.returnPeriodDays,
            taxRate: p.taxRate,
            // A shop photo that has a clean white-background copy is only the source
            // for that copy (taken on a bed or floor): customers see the clean one
            images: p.images
                .filter((img) => !p.images.some((other) => other.cleanedFromId === img.id))
                .map(({cleanedFromId, ...img}) => img),
            mrp: p.mrp,
            price: variants.length ? Math.min(...variants.map((v) => v.price)) : p.sellingPrice || p.mrp,
            colors: [...new Map(variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({name, hex})),
            sizes: sortSizes([...new Set(variants.map((v) => v.size))]),
            variants,
            offers,
            shop: {name: p.shop!.name, city: p.shop!.branch.city},
            rating: {
                avg,
                count: reviewCount,
                distribution: [5, 4, 3, 2, 1].map((star) => ({
                    star,
                    count: agg.find((a) => a.rating === star)?._count ?? 0,
                })),
            },
            // How buyers say it fits (only reviews that answered)
            fit: (() => {
                const said = p.reviews.filter((r) => r.fit);
                if (!said.length) return null;
                const share = (f: string) => Math.round((said.filter((r) => r.fit === f).length / said.length) * 100);
                return {count: said.length, small: share('SMALL'), true: share('TRUE'), large: share('LARGE')};
            })(),
            reviews: p.reviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                title: r.title,
                comment: r.comment,
                fit: r.fit,
                images: r.images,
                createdAt: r.createdAt,
                author: r.user.fullname.split(' ')[0] + (r.user.fullname.includes(' ') ? ` ${r.user.fullname.split(' ').pop()![0]}.` : ''),
            })),
            similar,
        };
    }

    public async suggest(q: string) {
        const term = q.trim();
        if (term.length < 2) return {suggestions: [], products: []};
        const cards = await this.cards({
            OR: [
                {name: {contains: term, mode: 'insensitive'}},
                {category: {name: {contains: term, mode: 'insensitive'}}},
                {subcategory: {name: {contains: term, mode: 'insensitive'}}},
                {brand: {name: {contains: term, mode: 'insensitive'}}},
            ],
        });
        // "silk saree in Women · Sarees" style lines, grouped by category
        const byCat = new Map<string, number>();
        for (const c of cards) {
            const key = [c.gender === 'MEN' ? 'Men' : c.gender === 'WOMEN' ? 'Women' : c.gender === 'UNISEX' ? 'All' : 'Kids', c.subcategory ?? c.category ?? '']
                .filter(Boolean)
                .join(' · ');
            byCat.set(key, (byCat.get(key) ?? 0) + 1);
        }
        return {
            suggestions: [...byCat.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([where, count]) => ({text: term.toLowerCase(), where, count})),
            products: cards.sort((a, b) => b.sold - a.sold).slice(0, 4),
        };
    }

    public async home() {
        const all = await this.cards({});
        const activeCoupons = await prisma.coupon.findMany({
            where: {isActive: true, startDate: {lte: new Date()}, endDate: {gte: new Date()}},
            orderBy: {discountValue: 'desc'},
            take: 2,
            select: {code: true, name: true, description: true, type: true, discountValue: true, minPurchaseAmount: true, maxDiscountLimit: true, endDate: true},
        });

        const catCount = new Map<string, number>();
        for (const c of all) if (c.category) catCount.set(c.category, (catCount.get(c.category) ?? 0) + 1);
        const byGender = (g: string[]) => all.filter((c) => g.includes(c.gender));
        const trending = (list: typeof all) =>
            [...list].sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.sold - a.sold).slice(0, 8);

        return {
            categories: [...catCount.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([name, count]) => ({name, count})),
            under999: all.filter((c) => c.price < 999 && c.inStock).length,
            newArrivals: [...all].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 8),
            trending: {
                women: trending(byGender(['WOMEN', 'UNISEX'])),
                men: trending(byGender(['MEN', 'UNISEX'])),
                kids: trending(byGender(['KIDS', 'BOYS', 'GIRLS'])),
            },
            coupons: activeCoupons,
            cities: [...new Set(all.map((c) => c.shop.city))].slice(0, 4),
        };
    }

    /** Delivery estimate for a pincode (all shops ship India-wide) */
    public deliveryEstimate(pincode: string) {
        if (!/^[1-9]\d{5}$/.test(pincode)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Enter a valid 6-digit pincode');
        }
        const by = (days: number) => {
            const d = new Date(Date.now() + days * DAY);
            return d.toLocaleDateString('en-IN', {weekday: 'short', day: 'numeric', month: 'short'});
        };
        return {
            pincode,
            standard: {by: by(4), fee: 0, freeAbove: FREE_DELIVERY_ABOVE, feeBelow: STANDARD_FEE},
            express: {by: by(1), fee: EXPRESS_FEE},
            cod: true,
            returns: '7-day returns and size exchange',
        };
    }
}

export const FREE_DELIVERY_ABOVE = 999;
export const STANDARD_FEE = 49;
export const EXPRESS_FEE = 99;

export default new CatalogService();
