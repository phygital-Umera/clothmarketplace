import httpStatus from 'http-status';
import {OrderStatus, Prisma, ProductStatus} from '@prisma/client';
import {z} from 'zod';
import prisma from '../../client';
import ApiError from '@utils/ApiError';
import {field} from '../../validations/custom.validation';
import {EXPRESS_FEE, FREE_DELIVERY_ABOVE, STANDARD_FEE, sortSizes, stockOf} from './catalog.service';

/*
 * Signed-in customer: bag, wishlist, addresses, coupons and reviews.
 * Prices always come from the database, never from the client.
 */

const round2 = (v: number) => Math.round(v * 100) / 100;

export const addToCartSchema = z.object({
    variantId: z.string({required_error: 'Choose a size'}).uuid('Choose a size'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10, 'At most 10 of one item').default(1),
});
export const updateCartSchema = z.object({
    variantId: z.string().uuid('Choose a size').optional(),
    quantity: z.coerce.number().int().min(1).max(10).optional(),
});
export const addressSchema = z.object({
    recipient: field({label: 'Full Name', kind: 'name'}),
    phone: field({label: 'Mobile', kind: 'phone'}),
    postalCode: field({label: 'Pincode', kind: 'pincode'}),
    address1: field({label: 'Flat / House no., Building', kind: 'text', max: 200}),
    address2: field({label: 'Area, Street, Landmark', kind: 'text', max: 200, required: false}),
    city: field({label: 'City', kind: 'text', max: 60}),
    district: field({label: 'District', kind: 'text', max: 60, required: false}),
    state: field({label: 'State', kind: 'text', max: 60}),
    label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
    isDefault: z.boolean().default(false),
});
export const reviewSchema = z.object({
    rating: z.coerce.number().int().min(1, 'Choose 1 to 5 stars').max(5, 'Choose 1 to 5 stars'),
    title: field({label: 'Title', kind: 'text', max: 80, required: false}),
    comment: field({label: 'Review', kind: 'text', max: 1000, required: false}),
    fit: z.enum(['SMALL', 'TRUE', 'LARGE']).nullable().optional(),
    images: z.array(z.string().url('Upload the photo again').max(500)).max(4, 'Up to 4 photos').default([]),
});

export const DELIVERY_OPTIONS = ['STANDARD', 'EXPRESS', 'PICKUP'] as const;
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];

const CART_INCLUDE = {
    items: {
        orderBy: {createdAt: 'asc' as const},
        include: {
            variant: {
                select: {
                    id: true,
                    size: true,
                    color: true,
                    colorHex: true,
                    image: true,
                    sellingPrice: true,
                    mrp: true,
                    isActive: true,
                    inventories: {select: {branchId: true, physicalQty: true, reservedQty: true}},
                },
            },
            product: {
                select: {
                    id: true,
                    name: true,
                    mrp: true,
                    sellingPrice: true,
                    status: true,
                    deletedAt: true,
                    companyId: true,
                    shopId: true,
                    brand: {select: {name: true}},
                    shop: {select: {name: true, branchId: true, status: true, branch: {select: {city: true}}}},
                    images: {orderBy: [{isMain: 'desc' as const}, {order: 'asc' as const}], take: 1, select: {url: true}},
                    variants: {where: {isActive: true}, select: {id: true, size: true, color: true, inventories: {select: {branchId: true, physicalQty: true, reservedQty: true}}}},
                },
            },
        },
    },
} satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{include: typeof CART_INCLUDE}>;

/** A bag line as the store shows it, with what is wrong with it (if anything) */
const toLine = (i: CartRow['items'][number]) => {
    const p = i.product;
    const branchId = p.shop?.branchId ?? '';
    const stock = stockOf(i.variant, branchId);
    const price = i.variant.sellingPrice ?? p.sellingPrice ?? p.mrp;
    const mrp = i.variant.mrp ?? p.mrp;
    const available = p.status === ProductStatus.PUBLISHED && !p.deletedAt && i.variant.isActive && p.shop?.status === 'ACTIVE';
    return {
        id: i.id,
        productId: p.id,
        variantId: i.variant.id,
        name: p.name,
        brand: p.brand?.name ?? p.shop?.name ?? '',
        // The photo of the chosen colour when there is one (saved on the order too)
        image: i.variant.image || p.images[0]?.url || null,
        color: i.variant.color,
        colorHex: i.variant.colorHex,
        size: i.variant.size,
        // Other sizes in the same colour, for the size picker
        sizeOptions: sortSizes(
            p.variants.filter((v) => v.color === i.variant.color).map((v) => v.size),
        ).map((size) => {
            const v = p.variants.find((x) => x.color === i.variant.color && x.size === size)!;
            return {variantId: v.id, size, stock: stockOf(v, branchId)};
        }),
        quantity: i.quantity,
        price,
        mrp,
        lineTotal: round2(price * i.quantity),
        lineMrp: round2(mrp * i.quantity),
        stock,
        shop: p.shop ? {name: p.shop.name, city: p.shop.branch.city} : null,
        shopId: p.shopId,
        companyId: p.companyId,
        problem: !available ? 'No longer available' : stock === 0 ? 'Out of stock' : stock < i.quantity ? `Only ${stock} left` : null,
    };
};
export type CartLine = ReturnType<typeof toLine>;

class StoreCustomerService {
    private async cartRow(userId: string) {
        return prisma.cart.upsert({
            where: {userId},
            create: {userId},
            update: {},
            include: CART_INCLUDE,
        });
    }

    /** Coupon check against the bag; throws a clear message when it can't be used */
    public async couponFor(userId: string, code: string, lines: CartLine[]) {
        const now = new Date();
        const coupon = await prisma.coupon.findFirst({
            where: {code: code.trim().toUpperCase(), isActive: true},
            include: {_count: {select: {usages: {where: {userId}}}}},
        });
        if (!coupon) throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon code is not valid');
        if (coupon.startDate > now || coupon.endDate < now) throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon has expired');
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon has been used up');
        }
        if (coupon._count.usages >= coupon.perCustomerLimit) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'You have already used this coupon');
        }
        // Company / shop coupons apply to that company's / shop's items only
        const eligible = lines.filter(
            (l) => !l.problem && (!coupon.companyId || l.companyId === coupon.companyId) && (!coupon.shopId || l.shopId === coupon.shopId),
        );
        const eligibleTotal = round2(eligible.reduce((t, l) => t + l.lineTotal, 0));
        if (!eligibleTotal) throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon does not apply to the items in your bag');
        if (eligibleTotal < coupon.minPurchaseAmount) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Add ₹${round2(coupon.minPurchaseAmount - eligibleTotal).toLocaleString('en-IN')} more to use ${coupon.code}`,
            );
        }
        let discount = coupon.type === 'PERCENTAGE' ? (eligibleTotal * coupon.discountValue) / 100 : coupon.discountValue;
        if (coupon.maxDiscountLimit) discount = Math.min(discount, coupon.maxDiscountLimit);
        discount = round2(Math.min(discount, eligibleTotal));
        return {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description ?? coupon.name,
            discount,
            // Share of the discount per bag line, for splitting into shop orders
            share: new Map(eligible.map((l) => [l.id, round2((discount * l.lineTotal) / eligibleTotal)])),
        };
    }

    public deliveryFee(itemsTotal: number, option: DeliveryOption) {
        if (option === 'PICKUP') return 0;
        if (option === 'EXPRESS') return EXPRESS_FEE;
        return itemsTotal >= FREE_DELIVERY_ABOVE ? 0 : STANDARD_FEE;
    }

    /** The bag with totals; `couponCode` and `delivery` are what the customer chose so far */
    public async getCart(userId: string, opts: {couponCode?: string; delivery?: DeliveryOption} = {}) {
        const cart = await this.cartRow(userId);
        const lines = cart.items.map(toLine);
        const ok = lines.filter((l) => !l.problem);
        const totalMrp = round2(ok.reduce((t, l) => t + l.lineMrp, 0));
        const itemsTotal = round2(ok.reduce((t, l) => t + l.lineTotal, 0));
        let coupon: {code: string; description: string | null; discount: number} | null = null;
        let couponError: string | null = null;
        if (opts.couponCode) {
            try {
                const c = await this.couponFor(userId, opts.couponCode, lines);
                coupon = {code: c.code, description: c.description, discount: c.discount};
            } catch (e) {
                couponError = e instanceof ApiError ? e.message : 'This coupon cannot be used';
            }
        }
        const delivery = opts.delivery ?? 'STANDARD';
        const deliveryFee = ok.length ? this.deliveryFee(itemsTotal, delivery) : 0;
        const total = round2(itemsTotal - (coupon?.discount ?? 0) + deliveryFee);
        return {
            items: lines,
            count: lines.reduce((t, l) => t + l.quantity, 0),
            summary: {
                totalMrp,
                discountOnMrp: round2(totalMrp - itemsTotal),
                itemsTotal,
                coupon,
                couponError,
                delivery,
                deliveryFee,
                freeDeliveryAbove: FREE_DELIVERY_ABOVE,
                total,
                savings: round2(totalMrp - itemsTotal + (coupon?.discount ?? 0)),
            },
            hasProblems: lines.some((l) => l.problem),
        };
    }

    private async assertVariantBuyable(variantId: string, quantity: number) {
        const v = await prisma.productVariant.findFirst({
            where: {
                id: variantId,
                isActive: true,
                product: {status: ProductStatus.PUBLISHED, deletedAt: null, shop: {status: 'ACTIVE', deletedAt: null}},
            },
            include: {
                product: {select: {id: true, shop: {select: {branchId: true}}}},
                inventories: {select: {branchId: true, physicalQty: true, reservedQty: true}},
            },
        });
        if (!v) throw new ApiError(httpStatus.NOT_FOUND, 'This item is not available');
        const stock = stockOf(v, v.product.shop!.branchId);
        if (stock < quantity) {
            throw new ApiError(httpStatus.BAD_REQUEST, stock ? `Only ${stock} left in this size` : 'This size is out of stock');
        }
        return v;
    }

    public async addToCart(userId: string, data: z.infer<typeof addToCartSchema>) {
        const cart = await this.cartRow(userId);
        const existing = cart.items.find((i) => i.variantId === data.variantId);
        const quantity = Math.min(10, (existing?.quantity ?? 0) + data.quantity);
        const v = await this.assertVariantBuyable(data.variantId, quantity);
        if (existing) {
            await prisma.cartItem.update({where: {id: existing.id}, data: {quantity}});
        } else {
            await prisma.cartItem.create({data: {cartId: cart.id, productId: v.product.id, variantId: v.id, quantity}});
        }
        return this.getCart(userId);
    }

    private async ownLine(userId: string, lineId: string) {
        const line = await prisma.cartItem.findFirst({where: {id: lineId, cart: {userId}}});
        if (!line) throw new ApiError(httpStatus.NOT_FOUND, 'This item is not in your bag');
        return line;
    }

    public async updateLine(userId: string, lineId: string, data: z.infer<typeof updateCartSchema>) {
        const line = await this.ownLine(userId, lineId);
        const variantId = data.variantId ?? line.variantId;
        const quantity = data.quantity ?? line.quantity;
        const v = await this.assertVariantBuyable(variantId, quantity);
        if (v.product.id !== line.productId) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose a size of the same item');
        // Changing to a size already in the bag merges the two lines
        const twin = variantId !== line.variantId ? await prisma.cartItem.findFirst({where: {cartId: line.cartId, variantId}}) : null;
        if (twin) {
            await prisma.$transaction([
                prisma.cartItem.update({where: {id: twin.id}, data: {quantity: Math.min(10, twin.quantity + quantity)}}),
                prisma.cartItem.delete({where: {id: line.id}}),
            ]);
        } else {
            await prisma.cartItem.update({where: {id: line.id}, data: {variantId, quantity}});
        }
        return this.getCart(userId);
    }

    public async removeLine(userId: string, lineId: string, toWishlist = false) {
        const line = await this.ownLine(userId, lineId);
        await prisma.$transaction(async (tx) => {
            if (toWishlist) {
                await tx.wishlistItem.upsert({
                    where: {userId_productId: {userId, productId: line.productId}},
                    create: {userId, productId: line.productId},
                    update: {},
                });
            }
            await tx.cartItem.delete({where: {id: line.id}});
        });
        return this.getCart(userId);
    }

    // ---------------- Wishlist ----------------

    public async wishlist(userId: string) {
        const rows = await prisma.wishlistItem.findMany({
            where: {userId},
            orderBy: {createdAt: 'desc'},
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        mrp: true,
                        sellingPrice: true,
                        status: true,
                        deletedAt: true,
                        brand: {select: {name: true}},
                        shop: {select: {name: true, branchId: true}},
                        images: {orderBy: [{isMain: 'desc'}, {order: 'asc'}], take: 1, select: {url: true}},
                        variants: {
                            where: {isActive: true},
                            select: {id: true, size: true, color: true, colorHex: true, sellingPrice: true, inventories: {select: {branchId: true, physicalQty: true, reservedQty: true}}},
                        },
                    },
                },
            },
        });
        return rows.map(({product: p, createdAt}) => {
            const branchId = p.shop?.branchId ?? '';
            const variants = p.variants.map((v) => ({
                variantId: v.id,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                stock: stockOf(v, branchId),
                price: v.sellingPrice ?? p.sellingPrice ?? p.mrp,
            }));
            const price = variants.length ? Math.min(...variants.map((v) => v.price)) : p.sellingPrice || p.mrp;
            const stock = variants.reduce((t, v) => t + v.stock, 0);
            return {
                productId: p.id,
                name: p.name,
                brand: p.brand?.name ?? p.shop?.name ?? '',
                image: p.images[0]?.url ?? null,
                colorHex: variants[0]?.colorHex ?? null,
                price,
                mrp: p.mrp,
                discountPct: p.mrp > price ? Math.round(((p.mrp - price) / p.mrp) * 100) : 0,
                available: p.status === ProductStatus.PUBLISHED && !p.deletedAt,
                stock,
                variants: variants.sort((a, b) => sortSizes([a.size, b.size])[0] === a.size ? -1 : 1),
                addedAt: createdAt,
            };
        });
    }

    public async addToWishlist(userId: string, productId: string) {
        const product = await prisma.product.findFirst({where: {id: productId, status: ProductStatus.PUBLISHED, deletedAt: null}, select: {id: true}});
        if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'This product is not available');
        await prisma.wishlistItem.upsert({
            where: {userId_productId: {userId, productId}},
            create: {userId, productId},
            update: {},
        });
        return {productIds: await this.wishlistIds(userId)};
    }

    public async removeFromWishlist(userId: string, productId: string) {
        await prisma.wishlistItem.deleteMany({where: {userId, productId}});
        return {productIds: await this.wishlistIds(userId)};
    }

    public async wishlistIds(userId: string) {
        return (await prisma.wishlistItem.findMany({where: {userId}, select: {productId: true}})).map((w) => w.productId);
    }

    // ---------------- Addresses ----------------

    public listAddresses(userId: string) {
        return prisma.customerAddress.findMany({where: {userId}, orderBy: [{isDefault: 'desc'}, {updatedAt: 'desc'}]});
    }

    public async saveAddress(userId: string, data: z.infer<typeof addressSchema>, id?: string) {
        const {label, ...fields} = data;
        if (id) {
            const found = await prisma.customerAddress.findFirst({where: {id, userId}, select: {id: true}});
            if (!found) throw new ApiError(httpStatus.NOT_FOUND, 'Address not found');
        }
        const count = await prisma.customerAddress.count({where: {userId}});
        const isDefault = fields.isDefault || count === 0 || (count === 1 && !!id);
        return prisma.$transaction(async (tx) => {
            if (isDefault) await tx.customerAddress.updateMany({where: {userId}, data: {isDefault: false}});
            const row = {...fields, label, isDefault};
            return id
                ? tx.customerAddress.update({where: {id}, data: row})
                : tx.customerAddress.create({data: {...row, userId}});
        });
    }

    public async deleteAddress(userId: string, id: string) {
        const found = await prisma.customerAddress.findFirst({where: {id, userId}});
        if (!found) throw new ApiError(httpStatus.NOT_FOUND, 'Address not found');
        await prisma.customerAddress.delete({where: {id}});
        // Keep one default
        if (found.isDefault) {
            const next = await prisma.customerAddress.findFirst({where: {userId}, orderBy: {updatedAt: 'desc'}});
            if (next) await prisma.customerAddress.update({where: {id: next.id}, data: {isDefault: true}});
        }
        return this.listAddresses(userId);
    }

    // ---------------- Reviews ----------------

    /** Only customers whose order with this product was delivered may review it */
    public async review(userId: string, productId: string, data: z.infer<typeof reviewSchema>) {
        const bought = await prisma.orderItem.findFirst({
            where: {productId, order: {customerId: userId, status: OrderStatus.DELIVERED}},
            select: {id: true},
        });
        if (!bought) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can review this product once your order of it is delivered');
        }
        const existing = await prisma.productReview.findFirst({where: {productId, userId}, select: {id: true}});
        return existing
            ? prisma.productReview.update({where: {id: existing.id}, data})
            : prisma.productReview.create({data: {...data, productId, userId}});
    }

    public myReviews(userId: string) {
        return prisma.productReview.findMany({
            where: {userId},
            orderBy: {createdAt: 'desc'},
            include: {
                product: {
                    select: {id: true, slug: true, name: true, images: {orderBy: [{isMain: 'desc'}, {order: 'asc'}], take: 1, select: {url: true}}},
                },
            },
        });
    }

    /** Products from delivered orders that are still waiting for a review */
    public async toReview(userId: string) {
        const [items, reviewed] = await Promise.all([
            prisma.orderItem.findMany({
                where: {order: {customerId: userId, status: OrderStatus.DELIVERED}},
                orderBy: {order: {createdAt: 'desc'}},
                select: {
                    productId: true,
                    productName: true,
                    size: true,
                    color: true,
                    image: true,
                    order: {select: {id: true, orderNumber: true, updatedAt: true}},
                    product: {select: {slug: true, images: {orderBy: [{isMain: 'desc'}, {order: 'asc'}], take: 1, select: {url: true}}}},
                },
            }),
            prisma.productReview.findMany({where: {userId}, select: {productId: true}}),
        ]);
        const done = new Set(reviewed.map((r) => r.productId));
        const seen = new Set<string>();
        return items
            .filter((i) => !done.has(i.productId) && !seen.has(i.productId) && seen.add(i.productId))
            .map(({product, ...i}) => ({...i, slug: product.slug, image: i.image ?? product.images[0]?.url ?? null}));
    }

    public async publicCoupons() {
        const now = new Date();
        return prisma.coupon.findMany({
            where: {isActive: true, startDate: {lte: now}, endDate: {gte: now}},
            orderBy: {discountValue: 'desc'},
            select: {code: true, name: true, description: true, type: true, discountValue: true, minPurchaseAmount: true, maxDiscountLimit: true, endDate: true},
        });
    }
}

export default new StoreCustomerService();
