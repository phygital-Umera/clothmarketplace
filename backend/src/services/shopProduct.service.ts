import httpStatus from 'http-status';
import {Prisma, ProductStatus} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {listArgs, toListResult} from '../utils/list';
import {shopProductValidation} from '@validations/index';
import accountService from './account.service';

type CreateShopProduct = z.infer<typeof shopProductValidation.createShopProductSchema>;
type UpdateShopProduct = z.infer<typeof shopProductValidation.updateShopProductSchema>;
type ShopProductList = z.infer<typeof shopProductValidation.shopProductListSchema>;
type Tx = Prisma.TransactionClient;

/** Products of one shop; always taken from the signed-in user */
export type ShopScope = {companyId: string; shopId: string};
/** Reading one product: a shop sees its own, a company admin (no shopId) any product of the company */
export type ProductScope = {companyId: string; shopId?: string};

const MAX_IMAGES = 8;
export const LOW_STOCK = 5;

const LIST_INCLUDE = {
    category: {select: {id: true, name: true}},
    subcategory: {select: {id: true, name: true}},
    sizes: {include: {size: {select: {id: true, name: true, code: true, displayOrder: true}}}},
    colors: {include: {color: {select: {id: true, name: true, code: true, hexCode: true}}}},
    images: {orderBy: [{isMain: 'desc' as const}, {order: 'asc' as const}]},
} satisfies Prisma.ProductInclude;

const DETAIL_INCLUDE = {
    ...LIST_INCLUDE,
    createdBy: {select: {id: true, fullname: true}},
    previews: {
        orderBy: {createdAt: 'asc' as const},
        include: {color: {select: {id: true, name: true, hexCode: true}}},
    },
} satisfies Prisma.ProductInclude;

type ListRow = Prisma.ProductGetPayload<{include: typeof LIST_INCLUDE}>;

/** "Navy Blue" + "XL" -> "NAV-XL" (variant SKU suffix, same as the catalog) */
const variantSuffix = (color: string, size: string) =>
    `${color.replace(/[^A-Za-z0-9]/g, '').slice(0, 3)}-${size.replace(/[^A-Za-z0-9]/g, '')}`.toUpperCase();

const slugify = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

/** Flatten the join rows into plain size / color lists */
const present = <T extends ListRow>({sizes, colors, ...p}: T) => ({
    ...p,
    sizes: sizes.map((s) => s.size).sort((a, b) => a.displayOrder - b.displayOrder),
    colors: colors.map((c) => c.color),
    mainImage: p.images[0]?.url ?? null,
});

const fieldError = (status: number, field: string, message: string) =>
    new ApiError(status, message, [{field, message}]);

class ShopProductService {
    private scopeWhere(scope: ShopScope, id?: string): Prisma.ProductWhereInput {
        return {
            ...(id ? {id} : {}),
            companyId: scope.companyId,
            shopId: scope.shopId,
            deletedAt: null,
        };
    }

    public async list(scope: ShopScope, query: ShopProductList) {
        const stock: Prisma.IntFilter | undefined =
            query.stock === 'out'
                ? {lte: 0}
                : query.stock === 'low'
                  ? {gt: 0, lte: LOW_STOCK}
                  : query.stock === 'in'
                    ? {gt: 0}
                    : undefined;
        const where: Prisma.ProductWhereInput = {
            ...this.scopeWhere(scope),
            status: query.status,
            categoryId: query.categoryId,
            subcategoryId: query.subcategoryId,
            stockQuantity: stock,
            ...(query.colorId ? {colors: {some: {colorId: query.colorId}}} : {}),
            ...(query.sizeId ? {sizes: {some: {sizeId: query.sizeId}}} : {}),
            ...(query.search
                ? {
                      OR: [
                          {name: {contains: query.search, mode: 'insensitive'}},
                          {sku: {contains: query.search, mode: 'insensitive'}},
                          {productType: {contains: query.search, mode: 'insensitive'}},
                          {tags: {has: query.search.toLowerCase()}},
                      ],
                  }
                : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.product.findMany({where, include: LIST_INCLUDE, ...listArgs(query)}),
            prisma.product.count({where}),
        ]);
        return toListResult(items.map(present), total, query);
    }

    /** 404 outside the caller's shop, or company when there is no shop (no probing others) */
    public async get(scope: ProductScope, id: string) {
        const product = await prisma.product.findFirst({
            where: {id, companyId: scope.companyId, deletedAt: null, ...(scope.shopId ? {shopId: scope.shopId} : {})},
            include: DETAIL_INCLUDE,
        });
        if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
        return present(product);
    }

    /**
     * Category and subcategory must be active and belong together; sizes and
     * colors must exist and be active (ones already on the product may stay
     * even if they were deactivated since).
     */
    private async assertRefs(
        companyId: string,
        data: {categoryId: string; subcategoryId?: string | null; sizeIds?: string[]; colorIds?: string[]},
        current?: {sizeIds: string[]; colorIds: string[]},
    ) {
        // Only the company's own masters or platform-wide ones
        const visible = {OR: [{companyId}, {companyId: null}]};
        const [category, subcategory] = await Promise.all([
            prisma.category.findFirst({where: {id: data.categoryId, ...visible}, select: {isActive: true}}),
            data.subcategoryId
                ? prisma.subcategory.findFirst({
                      where: {id: data.subcategoryId, ...visible},
                      select: {isActive: true, categoryId: true},
                  })
                : null,
        ]);
        if (!category?.isActive) {
            throw fieldError(httpStatus.BAD_REQUEST, 'categoryId', 'Select an active category');
        }
        // Subcategory is optional; when given it must be active and in the category
        if (data.subcategoryId && !subcategory?.isActive) {
            throw fieldError(
                httpStatus.BAD_REQUEST,
                'subcategoryId',
                'Select an active subcategory',
            );
        }
        if (subcategory && subcategory.categoryId !== data.categoryId) {
            throw fieldError(
                httpStatus.BAD_REQUEST,
                'subcategoryId',
                'This subcategory does not belong to the selected category',
            );
        }

        if (data.sizeIds) {
            const keep = new Set(current?.sizeIds);
            const found = await prisma.size.findMany({
                where: {id: {in: data.sizeIds}, ...visible},
                select: {id: true, isActive: true},
            });
            if (
                found.length !== data.sizeIds.length ||
                found.some((s) => !s.isActive && !keep.has(s.id))
            ) {
                throw fieldError(httpStatus.BAD_REQUEST, 'sizeIds', 'Select only active sizes');
            }
        }
        if (data.colorIds) {
            const keep = new Set(current?.colorIds);
            const found = await prisma.color.findMany({
                where: {id: {in: data.colorIds}, ...visible},
                select: {id: true, isActive: true},
            });
            if (
                found.length !== data.colorIds.length ||
                found.some((c) => !c.isActive && !keep.has(c.id))
            ) {
                throw fieldError(httpStatus.BAD_REQUEST, 'colorIds', 'Select only active colors');
            }
        }
    }

    private async assertSkuFree(sku: string, exceptId?: string) {
        const taken = await prisma.product.findUnique({where: {sku}, select: {id: true}});
        if (taken && taken.id !== exceptId) {
            throw fieldError(
                httpStatus.CONFLICT,
                'sku',
                'This SKU is already used by another product',
            );
        }
    }

    /**
     * Keep one ProductVariant per size x color (cart / orders work on
     * variants). Matching rows are kept or re-activated, others deactivated.
     */
    private async syncVariants(tx: Tx, productId: string, sku: string) {
        const product = await tx.product.findUniqueOrThrow({
            where: {id: productId},
            select: {
                shop: {select: {branchId: true}},
                sizes: {select: {size: {select: {name: true}}}},
                colors: {select: {color: {select: {name: true, hexCode: true}}}},
                variants: {select: {id: true, size: true, color: true}},
            },
        });
        const keep = new Set<string>();
        for (const {size} of product.sizes) {
            for (const {color} of product.colors) {
                const existing = product.variants.find(
                    (v) =>
                        v.size.toLowerCase() === size.name.toLowerCase() &&
                        v.color.toLowerCase() === color.name.toLowerCase(),
                );
                if (existing) {
                    keep.add(existing.id);
                    await tx.productVariant.update({
                        where: {id: existing.id},
                        data: {isActive: true, colorHex: color.hexCode},
                    });
                    continue;
                }
                let variantSku = `${sku}-${variantSuffix(color.name, size.name)}`;
                if (await tx.productVariant.findUnique({where: {variantSku}})) {
                    variantSku = `${variantSku}-${Date.now().toString(36).toUpperCase()}`;
                }
                const created = await tx.productVariant.create({
                    data: {
                        productId,
                        variantSku,
                        size: size.name,
                        color: color.name,
                        colorHex: color.hexCode,
                    },
                    select: {id: true},
                });
                keep.add(created.id);
            }
        }
        await tx.productVariant.updateMany({
            where: {productId, id: {notIn: [...keep]}},
            data: {isActive: false},
        });

        // Initialize inventory rows for active variants in the shop's branch
        const branchId = product.shop?.branchId;
        if (branchId) {
            for (const variantId of keep) {
                await tx.inventory.upsert({
                    where: {branchId_variantId: {branchId, variantId}},
                    create: {
                        branchId,
                        variantId,
                        physicalQty: 0,
                        reservedQty: 0,
                        threshold: 5,
                    },
                    update: {},
                });
            }
        }
    }

    public async create(scope: ShopScope, actorId: string, data: CreateShopProduct) {
        await this.assertRefs(scope.companyId, data);
        if (data.sku) await this.assertSkuFree(data.sku);
        const company = await prisma.company.findUniqueOrThrow({
            where: {id: scope.companyId},
            select: {code: true},
        });
        const {sizeIds, colorIds, sku: givenSku, sellingPrice, ...fields} = data;

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const sku =
                        givenSku ??
                        (await accountService.nextCode(tx, `${company.code}-P`, 4, async (prefix) =>
                            (
                                await tx.product.findMany({
                                    where: {sku: {startsWith: prefix}},
                                    select: {sku: true},
                                })
                            ).map((p) => p.sku),
                        ));
                    const product = await tx.product.create({
                        data: {
                            ...fields,
                            sellingPrice: sellingPrice ?? fields.mrp,
                            tags: fields.tags.map((t) => t.toLowerCase()),
                            companyId: scope.companyId,
                            shopId: scope.shopId,
                            sku,
                            slug: `${slugify(fields.name)}-${sku.toLowerCase()}`,
                            createdById: actorId,
                            sizes: {create: sizeIds.map((sizeId) => ({sizeId}))},
                            colors: {create: colorIds.map((colorId) => ({colorId}))},
                        },
                        select: {id: true},
                    });
                    await this.syncVariants(tx, product.id, sku);
                    return product;
                }),
            'sku',
        );
        return this.get(scope, created.id);
    }

    public async update(scope: ShopScope, id: string, data: UpdateShopProduct) {
        const before = await this.get(scope, id);
        const merged = {
            categoryId: data.categoryId ?? before.categoryId,
            // null = cleared on purpose; undefined = not sent, keep the current one
            subcategoryId: data.subcategoryId !== undefined ? data.subcategoryId : before.subcategoryId,
            mrp: data.mrp ?? before.mrp,
            sellingPrice:
                data.sellingPrice ?? (data.mrp !== undefined ? data.mrp : before.sellingPrice),
        };
        if (merged.sellingPrice > merged.mrp) {
            throw fieldError(
                httpStatus.BAD_REQUEST,
                'sellingPrice',
                'Discount Price cannot be more than Price',
            );
        }
        await this.assertRefs(
            scope.companyId,
            {...merged, sizeIds: data.sizeIds, colorIds: data.colorIds},
            {sizeIds: before.sizes.map((s) => s.id), colorIds: before.colors.map((c) => c.id)},
        );
        if (data.sku && data.sku !== before.sku) await this.assertSkuFree(data.sku, id);

        const {sizeIds, colorIds, ...fields} = data;
        const sku = data.sku ?? before.sku;
        await prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: {id},
                data: {
                    ...fields,
                    sellingPrice: merged.sellingPrice,
                    ...(fields.tags ? {tags: fields.tags.map((t) => t.toLowerCase())} : {}),
                    ...(fields.name || fields.sku
                        ? {slug: `${slugify(fields.name ?? before.name)}-${sku.toLowerCase()}`}
                        : {}),
                },
            });
            if (sizeIds) {
                await tx.productSize.deleteMany({where: {productId: id}});
                await tx.productSize.createMany({
                    data: sizeIds.map((sizeId) => ({productId: id, sizeId})),
                });
            }
            if (colorIds) {
                await tx.productColor.deleteMany({where: {productId: id}});
                await tx.productColor.createMany({
                    data: colorIds.map((colorId) => ({productId: id, colorId})),
                });
            }
            if (sizeIds || colorIds) await this.syncVariants(tx, id, sku);
        });
        return {before, after: await this.get(scope, id)};
    }

    /** Soft delete: hidden from the shop, kept for order history */
    public async delete(scope: ShopScope, id: string) {
        const before = await this.get(scope, id);
        await prisma.product.update({
            where: {id},
            data: {deletedAt: new Date(), status: ProductStatus.ARCHIVED},
        });
        return {before};
    }

    // ---- Images (originals; AI previews are stored separately) ------------------

    public async addImages(scope: ShopScope, id: string, urls: string[]) {
        const product = await this.get(scope, id);
        if (product.images.length + urls.length > MAX_IMAGES) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `A product can have at most ${MAX_IMAGES} images`,
            );
        }
        const start = product.images.length;
        await prisma.productImage.createMany({
            data: urls.map((url, i) => ({
                productId: id,
                url,
                altText: product.name,
                order: start + i,
                isMain: start === 0 && i === 0,
            })),
        });
        return this.get(scope, id);
    }

    public async updateImage(
        scope: ShopScope,
        id: string,
        imageId: string,
        data: {altText?: string; isMain?: boolean},
    ) {
        const product = await this.get(scope, id);
        if (!product.images.some((img) => img.id === imageId)) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        }
        await prisma.$transaction([
            ...(data.isMain
                ? [prisma.productImage.updateMany({where: {productId: id}, data: {isMain: false}})]
                : []),
            prisma.productImage.update({where: {id: imageId}, data}),
        ]);
        return this.get(scope, id);
    }

    /** Also removes the AI previews made from this image (cascade) */
    public async deleteImage(scope: ShopScope, id: string, imageId: string) {
        const product = await this.get(scope, id);
        const image = product.images.find((img) => img.id === imageId);
        if (!image) throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        await prisma.productImage.delete({where: {id: imageId}});
        if (image.isMain) {
            const next = product.images.find((img) => img.id !== imageId);
            if (next)
                await prisma.productImage.update({where: {id: next.id}, data: {isMain: true}});
        }
        return this.get(scope, id);
    }
}

export default new ShopProductService();
