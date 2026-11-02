import httpStatus from 'http-status';
import {Prisma, ProductStatus, Role} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {listArgs, toListResult} from '../utils/list';
import {catalogValidation} from '@validations/index';
import accountService from './account.service';
import categoryBrandService from './categoryBrand.service';

type CreateProduct = z.infer<typeof catalogValidation.createProductSchema>;
type UpdateProduct = z.infer<typeof catalogValidation.updateProductSchema>;
type ProductList = z.infer<typeof catalogValidation.productListSchema>;
type Actor = Express.Request['user'];

const MAX_IMAGES = 8;

const PRODUCT_INCLUDE = {
    category: {select: {id: true, name: true}},
    brand: {select: {id: true, name: true}},
    company: {select: {id: true, name: true, code: true}},
    createdBy: {select: {id: true, fullname: true, branchId: true}},
    images: {orderBy: [{isMain: 'desc' as const}, {order: 'asc' as const}]},
    variants: {
        orderBy: {createdAt: 'asc' as const},
        include: {inventories: {select: {branchId: true, physicalQty: true, reservedQty: true}}},
    },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{include: typeof PRODUCT_INCLUDE}>;

/** "Navy Blue" + "XL" -> "NAV-XL" (variant SKU suffix) */
const variantSuffix = (color: string, size: string) =>
    `${color.replace(/[^A-Za-z0-9]/g, '').slice(0, 3)}-${size.replace(/[^A-Za-z0-9]/g, '')}`.toUpperCase();

const slugify = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

/**
 * Who may edit a product:
 *   company admin -> any product of the company
 *   branch admin  -> products created in their branch
 *   employee      -> products they created (and only with products.manage)
 *   super admin   -> nobody's (monitors, can unpublish)
 */
const canEdit = (
    actor: Actor,
    product: Pick<ProductRow, 'companyId' | 'createdById'> & {
        createdBy: {branchId: string | null} | null;
    },
) => {
    if (product.companyId !== actor.companyId) return false;
    if (actor.role === Role.ADMIN) return true;
    if (actor.role === Role.SUB_ADMIN) return product.createdBy?.branchId === actor.branchId;
    if (actor.role === Role.EMPLOYEE) {
        return product.createdById === actor.id && actor.permissions.includes('products.manage');
    }
    return false;
};

const canPublish = (actor: Actor, product: Parameters<typeof canEdit>[1]) =>
    canEdit(actor, product) &&
    (actor.role !== Role.EMPLOYEE || actor.permissions.includes('products.publish'));

/** List / detail shape: stock totals and what the caller may do */
const present = (actor: Actor, p: ProductRow) => {
    const inScope = (inv: {branchId: string}) => !actor.branchId || inv.branchId === actor.branchId;
    const stock = p.variants
        .filter((v) => v.isActive)
        .flatMap((v) => v.inventories.filter(inScope))
        .reduce((sum, inv) => sum + inv.physicalQty - inv.reservedQty, 0);
    return {
        ...p,
        variants: p.variants.map(({inventories, ...v}) => ({
            ...v,
            available: inventories
                .filter(inScope)
                .reduce((s, inv) => s + inv.physicalQty - inv.reservedQty, 0),
        })),
        mainImage: p.images[0]?.url ?? null,
        activeVariantCount: p.variants.filter((v) => v.isActive).length,
        stock,
        canEdit: canEdit(actor, p),
        canPublish: canPublish(actor, p),
    };
};

class ProductService {
    private scopeWhere(actor: Actor, id?: string): Prisma.ProductWhereInput {
        return {
            ...(id ? {id} : {}),
            deletedAt: null,
            ...(actor.role === Role.SUPER_ADMIN ? {} : {companyId: actor.companyId ?? '__none__'}),
        };
    }

    public async list(actor: Actor, query: ProductList) {
        const where: Prisma.ProductWhereInput = {
            ...this.scopeWhere(actor),
            ...(actor.role === Role.SUPER_ADMIN && query.companyId
                ? {companyId: query.companyId}
                : {}),
            status: query.status,
            categoryId: query.categoryId,
            brandId: query.brandId,
            gender: query.gender,
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
            prisma.product.findMany({where, include: PRODUCT_INCLUDE, ...listArgs(query)}),
            prisma.product.count({where}),
        ]);
        return toListResult(
            items.map((p) => present(actor, p)),
            total,
            query,
        );
    }

    /** 404 outside the caller's company (no probing other companies) */
    public async get(actor: Actor, id: string) {
        const product = await prisma.product.findFirst({
            where: this.scopeWhere(actor, id),
            include: PRODUCT_INCLUDE,
        });
        if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
        return present(actor, product);
    }

    private async editable(actor: Actor, id: string) {
        const product = await this.get(actor, id);
        if (!product.canEdit)
            throw new ApiError(httpStatus.FORBIDDEN, 'You cannot edit this product');
        return product;
    }

    public async create(actor: Actor, data: CreateProduct) {
        if (!actor.companyId || actor.role === Role.SUPER_ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Products are created by companies');
        }
        if (actor.role === Role.EMPLOYEE && !actor.permissions.includes('products.manage')) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to add products');
        }
        const companyId = actor.companyId;
        await categoryBrandService.assertUsable(companyId, data.categoryId, data.brandId);
        const company = await prisma.company.findUniqueOrThrow({
            where: {id: companyId},
            select: {code: true},
        });
        const {variants, ...fields} = data;

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const sku = await accountService.nextCode(
                        tx,
                        `${company.code}-P`,
                        4,
                        async (prefix) =>
                            (
                                await tx.product.findMany({
                                    where: {sku: {startsWith: prefix}},
                                    select: {sku: true},
                                })
                            ).map((p) => p.sku),
                    );
                    return tx.product.create({
                        data: {
                            ...fields,
                            tags: fields.tags.map((t) => t.toLowerCase()),
                            companyId,
                            sku,
                            slug: `${slugify(fields.name)}-${sku.toLowerCase()}`,
                            // New products are drafts until they are complete and published
                            status: ProductStatus.DRAFT,
                            createdById: actor.id,
                            variants: {
                                create: variants.map((v) => ({
                                    size: v.size,
                                    color: v.color,
                                    colorHex: v.colorHex,
                                    mrp: v.mrp,
                                    sellingPrice: v.sellingPrice,
                                    isActive: v.isActive,
                                    variantSku: `${sku}-${variantSuffix(v.color, v.size)}`,
                                })),
                            },
                        },
                        select: {id: true},
                    });
                }),
            'sku',
        );
        return this.get(actor, created.id);
    }

    /**
     * Update fields and sync variants: listed ones are updated / added; ones
     * left out are deactivated (kept for stock and order history).
     */
    public async update(actor: Actor, id: string, data: UpdateProduct) {
        const before = await this.editable(actor, id);
        await categoryBrandService.assertUsable(before.companyId, data.categoryId, data.brandId);
        const {variants, ...fields} = data;

        await prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: {id},
                data: {
                    ...fields,
                    ...(fields.tags ? {tags: fields.tags.map((t) => t.toLowerCase())} : {}),
                    ...(fields.name
                        ? {slug: `${slugify(fields.name)}-${before.sku.toLowerCase()}`}
                        : {}),
                },
            });
            if (!variants) return;

            const keep = new Set(variants.filter((v) => v.id).map((v) => v.id));
            const unknown = [...keep].filter((vid) => !before.variants.some((v) => v.id === vid));
            if (unknown.length)
                throw new ApiError(httpStatus.BAD_REQUEST, 'Unknown variant in the list');

            for (const v of variants) {
                const values = {
                    size: v.size,
                    color: v.color,
                    colorHex: v.colorHex ?? null,
                    mrp: v.mrp ?? null,
                    sellingPrice: v.sellingPrice ?? null,
                    isActive: v.isActive,
                };
                if (v.id) {
                    await tx.productVariant.update({where: {id: v.id}, data: values});
                } else {
                    // A deactivated variant with the same size + color comes back
                    const old = before.variants.find(
                        (o) =>
                            !keep.has(o.id) &&
                            o.size.toLowerCase() === v.size.toLowerCase() &&
                            o.color.toLowerCase() === v.color.toLowerCase(),
                    );
                    if (old) {
                        keep.add(old.id);
                        await tx.productVariant.update({where: {id: old.id}, data: values});
                    } else {
                        let variantSku = `${before.sku}-${variantSuffix(v.color, v.size)}`;
                        if (await tx.productVariant.findUnique({where: {variantSku}})) {
                            variantSku = `${variantSku}-${Date.now().toString(36).toUpperCase()}`;
                        }
                        const created = await tx.productVariant.create({
                            data: {...values, productId: id, variantSku},
                            select: {id: true},
                        });
                        keep.add(created.id);
                    }
                }
            }
            await tx.productVariant.updateMany({
                where: {productId: id, id: {notIn: [...keep] as string[]}},
                data: {isActive: false},
            });
            if (before.status === ProductStatus.PUBLISHED && !variants.some((v) => v.isActive)) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    'A published product needs at least one active variant',
                );
            }
        });
        return {before, after: await this.get(actor, id)};
    }

    /** Draft / Published / Unpublished / Archived, with a publish checklist */
    public async setStatus(actor: Actor, id: string, status: ProductStatus) {
        const before = await this.get(actor, id);

        if (actor.role === Role.SUPER_ADMIN) {
            // Platform moderation: take a product off the store, nothing else
            if (status !== ProductStatus.UNPUBLISHED) {
                throw new ApiError(httpStatus.FORBIDDEN, 'Super admin can only unpublish products');
            }
        } else if (!before.canPublish) {
            throw new ApiError(
                httpStatus.FORBIDDEN,
                'You cannot change the status of this product',
            );
        }

        if (status === ProductStatus.PUBLISHED) {
            const missing = [
                !before.activeVariantCount && 'at least one active variant',
                !before.images.length && 'at least one image',
                !(before.sellingPrice > 0) && 'a selling price',
            ].filter(Boolean);
            if (missing.length) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `Before publishing, add ${missing.join(', ')}`,
                );
            }
        }

        await prisma.product.update({where: {id}, data: {status}});
        return {before, after: await this.get(actor, id)};
    }

    /** Soft delete; only the company admin, and kept for order history */
    public async delete(actor: Actor, id: string) {
        const before = await this.get(actor, id);
        if (actor.role !== Role.ADMIN || before.companyId !== actor.companyId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Only the company admin can delete products');
        }
        await prisma.product.update({
            where: {id},
            data: {deletedAt: new Date(), status: ProductStatus.ARCHIVED},
        });
        return {before};
    }

    // ---- Images --------------------------------------------------------------

    public async addImages(actor: Actor, id: string, urls: string[]) {
        const product = await this.editable(actor, id);
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
        return this.get(actor, id);
    }

    public async updateImage(
        actor: Actor,
        id: string,
        imageId: string,
        data: {altText?: string; isMain?: boolean; order?: number},
    ) {
        const product = await this.editable(actor, id);
        if (!product.images.some((img) => img.id === imageId)) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        }
        await prisma.$transaction([
            ...(data.isMain
                ? [prisma.productImage.updateMany({where: {productId: id}, data: {isMain: false}})]
                : []),
            prisma.productImage.update({where: {id: imageId}, data}),
        ]);
        return this.get(actor, id);
    }

    public async deleteImage(actor: Actor, id: string, imageId: string) {
        const product = await this.editable(actor, id);
        const image = product.images.find((img) => img.id === imageId);
        if (!image) throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        if (product.status === ProductStatus.PUBLISHED && product.images.length === 1) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'A published product needs at least one image',
            );
        }
        await prisma.productImage.delete({where: {id: imageId}});
        // Keep a main image
        if (image.isMain) {
            const next = product.images.find((img) => img.id !== imageId);
            if (next)
                await prisma.productImage.update({where: {id: next.id}, data: {isMain: true}});
        }
        return this.get(actor, id);
    }

    /** Counts for dashboards */
    public async counts(actor: Actor) {
        const base = this.scopeWhere(actor);
        const [total, published, draft] = await Promise.all([
            prisma.product.count({where: base}),
            prisma.product.count({where: {...base, status: ProductStatus.PUBLISHED}}),
            prisma.product.count({where: {...base, status: ProductStatus.DRAFT}}),
        ]);
        return {total, published, draft};
    }
}

export default new ProductService();
