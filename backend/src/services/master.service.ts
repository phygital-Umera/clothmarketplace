import httpStatus from 'http-status';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {ApiError} from '@utils/index';
import {listArgs, searchWhere, toListResult} from '../utils/list';
import masterValidation from '../validations/master.validation';
import accountService from './account.service';

type CategoryInput = z.infer<typeof masterValidation.createCategorySchema>;
type CategoryUpdate = z.infer<typeof masterValidation.updateCategorySchema>;
type SubcategoryInput = z.infer<typeof masterValidation.createSubcategorySchema>;
type SubcategoryUpdate = z.infer<typeof masterValidation.updateSubcategorySchema>;
type ColorInput = z.infer<typeof masterValidation.createColorSchema>;
type ColorUpdate = z.infer<typeof masterValidation.updateColorSchema>;
type SizeInput = z.infer<typeof masterValidation.createSizeSchema>;
type SizeUpdate = z.infer<typeof masterValidation.updateSizeSchema>;
type MasterList = z.infer<typeof masterValidation.masterListSchema>;

/*
 * Shop masters: categories, subcategories, colors and sizes.
 *
 * Categories and subcategories: one list per company, shared by its shops.
 * Rows with companyId = null are platform-wide (made by the super admin): every
 * company can pick them, but only the super admin can change them. A company
 * can never see or change another company's masters.
 *
 * Sizes and colours belong to each shop (D-02): the first time a shop uses
 * them it gets its own copy of the platform list and the company's own rows,
 * and from then on it sees and changes only its own, never another shop's.
 */

const codeFrom = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'ITEM';

const uniqueCode = async (base: string, taken: (prefix: string) => Promise<string[]>) => {
    const used = new Set(await taken(base));
    if (!used.has(base)) return base;
    for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
};

/** What a company can see: its own rows and the platform-wide ones */
const visible = (companyId: string) => ({OR: [{companyId}, {companyId: null}]});

const conflict = (message: string, field = 'name') =>
    new ApiError(httpStatus.CONFLICT, message, [{field, message}]);

const notFound = (what: string) => new ApiError(httpStatus.NOT_FOUND, `${what} not found`);

const readOnly = (what: string) =>
    new ApiError(
        httpStatus.FORBIDDEN,
        `This ${what} is shared across the platform and can only be changed by the super admin`,
    );

const withFlag = <T extends {companyId: string | null}>(row: T) => ({
    ...row,
    isGlobal: !row.companyId,
});

/** Sizes and colours: a shop's own (D-02); without a shop, the shared company and platform rows */
export type MasterScope = {companyId: string; shopId?: string | null};

const ownRows = (scope: MasterScope) =>
    scope.shopId ? {shopId: scope.shopId} : {shopId: null, ...visible(scope.companyId)};

const inScope = (row: {companyId: string | null; shopId: string | null}, scope: MasterScope) =>
    scope.shopId
        ? row.shopId === scope.shopId
        : !row.shopId && (!row.companyId || row.companyId === scope.companyId);

type Tx = Prisma.TransactionClient;

/** One copy per name (case-insensitive); the company's own row wins over the platform one */
const firstByName = <T extends {id: string; name: string; companyId: string | null}>(rows: T[]) => {
    const groups = new Map<string, T[]>();
    for (const row of rows) {
        const key = row.name.trim().toLowerCase();
        groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.values()].map((group) => ({
        keep: group.find((r) => r.companyId) ?? group[0],
        ids: group.map((r) => r.id),
    }));
};

/** Product links (productId + master id) moved from the shared rows to the shop's copies */
const remap = <T extends {productId: string}>(
    links: T[],
    idOf: (l: T) => string,
    map: Map<string, string>,
) => {
    const seen = new Set<string>();
    return links
        .filter((l) => map.has(idOf(l)))
        .map((l) => ({productId: l.productId, id: map.get(idOf(l)) as string}))
        .filter((l) => !seen.has(`${l.productId}:${l.id}`) && !!seen.add(`${l.productId}:${l.id}`));
};

class MasterService {
    /**
     * D-02: the first time a shop uses sizes or colours it gets its own copy of
     * the platform list and the company's own rows, and its products move to
     * the copies (links and AI colour previews). Once per shop, in one
     * transaction; a second request waits for the first and then skips.
     */
    public async ensureShopMasters(shopId: string) {
        const shop = await prisma.shop.findUnique({
            where: {id: shopId},
            select: {mastersCopiedAt: true},
        });
        if (!shop || shop.mastersCopiedAt) return;
        await prisma.$transaction(
            async (tx) => {
                const {count} = await tx.shop.updateMany({
                    where: {id: shopId, mastersCopiedAt: null},
                    data: {mastersCopiedAt: new Date()},
                });
                if (!count) return;
                const {companyId, code} = await tx.shop.findUniqueOrThrow({
                    where: {id: shopId},
                    select: {companyId: true, code: true},
                });
                const shared = {shopId: null, ...visible(companyId)};
                const taken = async (model: 'size' | 'color') =>
                    new Set(
                        (model === 'size'
                            ? await tx.size.findMany({
                                  where: {code: {startsWith: `${code}-`}},
                                  select: {code: true},
                              })
                            : await tx.color.findMany({
                                  where: {code: {startsWith: `${code}-`}},
                                  select: {code: true},
                              })
                        ).map((r) => r.code),
                    );
                const codeOf = (used: Set<string>, base: string) => {
                    let next = `${code}-${base}`;
                    for (let n = 2; used.has(next); n++) next = `${code}-${base}-${n}`;
                    used.add(next);
                    return next;
                };

                const sizeMap = new Map<string, string>();
                const usedSizes = await taken('size');
                for (const {keep, ids} of firstByName(await tx.size.findMany({where: shared}))) {
                    const copy = await tx.size.create({
                        data: {
                            companyId,
                            shopId,
                            name: keep.name,
                            code: codeOf(usedSizes, keep.code),
                            description: keep.description,
                            displayOrder: keep.displayOrder,
                            isActive: keep.isActive,
                        },
                        select: {id: true},
                    });
                    ids.forEach((id) => sizeMap.set(id, copy.id));
                }
                const colorMap = new Map<string, string>();
                const usedColors = await taken('color');
                for (const {keep, ids} of firstByName(await tx.color.findMany({where: shared}))) {
                    const copy = await tx.color.create({
                        data: {
                            companyId,
                            shopId,
                            name: keep.name,
                            code: codeOf(usedColors, keep.code),
                            hexCode: keep.hexCode,
                            isActive: keep.isActive,
                        },
                        select: {id: true},
                    });
                    ids.forEach((id) => colorMap.set(id, copy.id));
                }
                await this.moveLinks(tx, shopId, sizeMap, colorMap);
            },
            {timeout: 60_000},
        );
    }

    private async moveLinks(
        tx: Tx,
        shopId: string,
        sizeMap: Map<string, string>,
        colorMap: Map<string, string>,
    ) {
        const ofShop = {product: {shopId}};
        const sizeLinks = await tx.productSize.findMany({
            where: {...ofShop, sizeId: {in: [...sizeMap.keys()]}},
        });
        if (sizeLinks.length) {
            await tx.productSize.deleteMany({
                where: {...ofShop, sizeId: {in: [...sizeMap.keys()]}},
            });
            await tx.productSize.createMany({
                data: remap(sizeLinks, (l) => l.sizeId, sizeMap).map((l) => ({
                    productId: l.productId,
                    sizeId: l.id,
                })),
                skipDuplicates: true,
            });
        }
        const colorLinks = await tx.productColor.findMany({
            where: {...ofShop, colorId: {in: [...colorMap.keys()]}},
        });
        if (colorLinks.length) {
            await tx.productColor.deleteMany({
                where: {...ofShop, colorId: {in: [...colorMap.keys()]}},
            });
            await tx.productColor.createMany({
                data: remap(colorLinks, (l) => l.colorId, colorMap).map((l) => ({
                    productId: l.productId,
                    colorId: l.id,
                })),
                skipDuplicates: true,
            });
        }
        for (const [from, to] of colorMap) {
            await tx.productColorPreview.updateMany({
                where: {...ofShop, colorId: from},
                data: {colorId: to},
            });
        }
    }

    /**
     * D-02: a product copied into another shop (stock transfer) uses that
     * shop's own sizes and colours with the same names, made when missing.
     * A shop that has not copied its masters yet still uses the shared rows.
     */
    public async sameInShop(tx: Tx, shopId: string, sizeIds: string[], colorIds: string[]) {
        const shop = await tx.shop.findUniqueOrThrow({
            where: {id: shopId},
            select: {companyId: true, code: true, mastersCopiedAt: true},
        });
        if (!shop.mastersCopiedAt) return {sizeIds, colorIds};
        const freeCode = async (model: 'size' | 'color', base: string) => {
            for (let n = 1; ; n++) {
                const code = n === 1 ? `${shop.code}-${base}` : `${shop.code}-${base}-${n}`;
                const taken =
                    model === 'size'
                        ? await tx.size.findUnique({where: {code}, select: {id: true}})
                        : await tx.color.findUnique({where: {code}, select: {id: true}});
                if (!taken) return code;
            }
        };
        const mine = {shopId};
        const outSizes: string[] = [];
        for (const src of await tx.size.findMany({where: {id: {in: sizeIds}}})) {
            const found = await tx.size.findFirst({
                where: {...mine, name: {equals: src.name, mode: 'insensitive'}},
                select: {id: true},
            });
            outSizes.push(
                found?.id ??
                    (
                        await tx.size.create({
                            data: {
                                companyId: shop.companyId,
                                shopId,
                                name: src.name,
                                code: await freeCode('size', src.code),
                                description: src.description,
                                displayOrder: src.displayOrder,
                            },
                            select: {id: true},
                        })
                    ).id,
            );
        }
        const outColors: string[] = [];
        for (const src of await tx.color.findMany({where: {id: {in: colorIds}}})) {
            const found = await tx.color.findFirst({
                where: {...mine, name: {equals: src.name, mode: 'insensitive'}},
                select: {id: true},
            });
            outColors.push(
                found?.id ??
                    (
                        await tx.color.create({
                            data: {
                                companyId: shop.companyId,
                                shopId,
                                name: src.name,
                                code: await freeCode('color', src.code),
                                hexCode: src.hexCode,
                            },
                            select: {id: true},
                        })
                    ).id,
            );
        }
        return {sizeIds: [...new Set(outSizes)], colorIds: [...new Set(outColors)]};
    }

    /** Ensure the shop's copies exist before any size / colour work in a shop */
    private async ready(scope: MasterScope) {
        if (scope.shopId) await this.ensureShopMasters(scope.shopId);
    }

    /** A size / colour the caller may change: the shop's own (or, without a shop, the company's own) */
    private ownedRow<T extends {companyId: string | null; shopId: string | null} | null>(
        row: T,
        scope: MasterScope,
        what: string,
    ): NonNullable<T> {
        if (!row || !inScope(row, scope)) throw notFound(what);
        if (!row.companyId) throw readOnly(what.toLowerCase());
        return row as NonNullable<T>;
    }

    /** A row the company may change: its own, never a platform-wide one */
    private async owned<T extends {companyId: string | null} | null>(
        row: T,
        companyId: string,
        what: string,
    ): Promise<NonNullable<T>> {
        if (!row || (row.companyId && row.companyId !== companyId)) throw notFound(what);
        if (!row.companyId) throw readOnly(what.toLowerCase());
        return row as NonNullable<T>;
    }

    // ==========================================
    // 1. CATEGORIES
    // ==========================================

    public async listCategories(companyId: string, query: MasterList) {
        const where: Prisma.CategoryWhereInput = {
            AND: [visible(companyId), {OR: searchWhere(query.search, ['name', 'code'] as const)}],
            ...(query.active ? {isActive: query.active === 'true'} : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.category.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            products: {where: {deletedAt: null, companyId}},
                            subcategories: {where: visible(companyId)},
                        },
                    },
                },
                ...listArgs(query),
            }),
            prisma.category.count({where}),
        ]);
        return toListResult(
            items.map(({_count, ...c}) => ({
                ...withFlag(c),
                productCount: _count.products,
                subcategoryCount: _count.subcategories,
            })),
            total,
            query,
        );
    }

    public async getCategory(companyId: string, id: string) {
        const category = await prisma.category.findFirst({
            where: {id, ...visible(companyId)},
            include: {
                subcategories: {
                    where: visible(companyId),
                    select: {id: true, name: true, code: true, isActive: true},
                    orderBy: {name: 'asc'},
                },
                _count: {
                    select: {
                        products: {where: {deletedAt: null, companyId}},
                        subcategories: {where: visible(companyId)},
                    },
                },
            },
        });
        if (!category) throw notFound('Category');
        const {_count, ...rest} = category;
        return {
            ...withFlag(rest),
            productCount: _count.products,
            subcategoryCount: _count.subcategories,
        };
    }

    public async categoryOptions(companyId: string) {
        return prisma.category.findMany({
            where: {isActive: true, ...visible(companyId)},
            select: {id: true, name: true, code: true},
            orderBy: [{displayOrder: 'asc'}, {name: 'asc'}],
        });
    }

    private async assertCategoryNameFree(companyId: string, name: string, exceptId?: string) {
        const clash = await prisma.category.findFirst({
            where: {
                name: {equals: name, mode: 'insensitive'},
                ...visible(companyId),
                ...(exceptId ? {NOT: {id: exceptId}} : {}),
            },
            select: {id: true},
        });
        if (clash) throw conflict('A category with this name already exists');
    }

    public async createCategory(companyId: string, data: CategoryInput) {
        await this.assertCategoryNameFree(companyId, data.name);
        return accountService.withRetry(async () => {
            const code = await uniqueCode(codeFrom(data.name), async (prefix) =>
                (
                    await prisma.category.findMany({
                        where: {code: {startsWith: prefix}},
                        select: {code: true},
                    })
                ).map((c) => c.code),
            );
            return prisma.category.create({
                data: {
                    companyId,
                    name: data.name,
                    code,
                    description: data.description,
                    displayOrder: data.displayOrder ?? 0,
                    isActive: data.isActive ?? true,
                },
            });
        }, 'code');
    }

    public async updateCategory(companyId: string, id: string, data: CategoryUpdate) {
        const before = await this.owned(
            await prisma.category.findUnique({where: {id}}),
            companyId,
            'Category',
        );
        if (data.name && data.name.toLowerCase() !== before.name.toLowerCase()) {
            await this.assertCategoryNameFree(companyId, data.name, id);
        }
        const after = await prisma.category.update({where: {id}, data});
        return {before, after};
    }

    public async deleteCategory(companyId: string, id: string) {
        const category = await this.owned(
            await prisma.category.findUnique({
                where: {id},
                include: {_count: {select: {products: true, subcategories: true}}},
            }),
            companyId,
            'Category',
        );
        if (category._count.products > 0 || category._count.subcategories > 0) {
            throw new ApiError(
                httpStatus.CONFLICT,
                `Cannot delete: this category has ${category._count.subcategories} subcategories and ${category._count.products} products. Move them first, or deactivate the category.`,
            );
        }
        await prisma.category.delete({where: {id}});
        return {before: category};
    }

    // ==========================================
    // 2. SUBCATEGORIES
    // ==========================================

    public async listSubcategories(companyId: string, query: MasterList) {
        const where: Prisma.SubcategoryWhereInput = {
            AND: [visible(companyId), {OR: searchWhere(query.search, ['name', 'code'] as const)}],
            ...(query.active ? {isActive: query.active === 'true'} : {}),
            ...(query.categoryId ? {categoryId: query.categoryId} : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.subcategory.findMany({
                where,
                include: {category: {select: {id: true, name: true, code: true}}},
                ...listArgs(query),
            }),
            prisma.subcategory.count({where}),
        ]);
        return toListResult(items.map(withFlag), total, query);
    }

    public async getSubcategory(companyId: string, id: string) {
        const sub = await prisma.subcategory.findFirst({
            where: {id, ...visible(companyId)},
            include: {category: {select: {id: true, name: true, code: true}}},
        });
        if (!sub) throw notFound('Subcategory');
        return withFlag(sub);
    }

    /** The parent must be one of the company's categories or a platform-wide one */
    private async assertParent(companyId: string, categoryId: string) {
        const parent = await prisma.category.findFirst({
            where: {id: categoryId, ...visible(companyId)},
            select: {id: true},
        });
        if (!parent) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Selected parent category does not exist', [
                {field: 'categoryId', message: 'Selected parent category does not exist'},
            ]);
        }
    }

    private async assertSubcategoryNameFree(
        companyId: string,
        categoryId: string,
        name: string,
        exceptId?: string,
    ) {
        const clash = await prisma.subcategory.findFirst({
            where: {
                categoryId,
                name: {equals: name, mode: 'insensitive'},
                ...visible(companyId),
                ...(exceptId ? {NOT: {id: exceptId}} : {}),
            },
            select: {id: true},
        });
        if (clash) throw conflict('A subcategory with this name already exists in this category');
    }

    public async createSubcategory(companyId: string, data: SubcategoryInput) {
        await this.assertParent(companyId, data.categoryId);
        await this.assertSubcategoryNameFree(companyId, data.categoryId, data.name);
        return accountService.withRetry(async () => {
            const code = await uniqueCode(codeFrom(data.name), async (prefix) =>
                (
                    await prisma.subcategory.findMany({
                        where: {code: {startsWith: prefix}},
                        select: {code: true},
                    })
                ).map((s) => s.code),
            );
            return prisma.subcategory.create({
                data: {
                    companyId,
                    categoryId: data.categoryId,
                    name: data.name,
                    code,
                    description: data.description,
                    displayOrder: data.displayOrder ?? 0,
                    isActive: data.isActive ?? true,
                },
                include: {category: {select: {id: true, name: true, code: true}}},
            });
        }, 'code');
    }

    public async updateSubcategory(companyId: string, id: string, data: SubcategoryUpdate) {
        const before = await this.owned(
            await prisma.subcategory.findUnique({where: {id}}),
            companyId,
            'Subcategory',
        );
        const categoryId = data.categoryId ?? before.categoryId;
        if (data.categoryId && data.categoryId !== before.categoryId) {
            await this.assertParent(companyId, data.categoryId);
        }
        if (data.name || data.categoryId) {
            await this.assertSubcategoryNameFree(
                companyId,
                categoryId,
                data.name ?? before.name,
                id,
            );
        }
        const after = await prisma.subcategory.update({
            where: {id},
            data,
            include: {category: {select: {id: true, name: true, code: true}}},
        });
        return {before, after};
    }

    public async deleteSubcategory(companyId: string, id: string) {
        const sub = await this.owned(
            await prisma.subcategory.findUnique({where: {id}}),
            companyId,
            'Subcategory',
        );
        const used = await prisma.product.count({where: {subcategoryId: id, deletedAt: null}});
        if (used) {
            throw new ApiError(
                httpStatus.CONFLICT,
                `This subcategory is used by ${used} product(s); deactivate it instead`,
            );
        }
        await prisma.subcategory.delete({where: {id}});
        return {before: sub};
    }

    // ==========================================
    // 3. COLORS (per shop, D-02)
    // ==========================================

    public async listColors(scope: MasterScope, query: MasterList) {
        await this.ready(scope);
        const where: Prisma.ColorWhereInput = {
            AND: [
                ownRows(scope),
                {OR: searchWhere(query.search, ['name', 'code', 'hexCode'] as const)},
            ],
            ...(query.active ? {isActive: query.active === 'true'} : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.color.findMany({where, ...listArgs(query)}),
            prisma.color.count({where}),
        ]);
        return toListResult(items.map(withFlag), total, query);
    }

    public async getColor(scope: MasterScope, id: string) {
        await this.ready(scope);
        const color = await prisma.color.findFirst({where: {id, ...ownRows(scope)}});
        if (!color) throw notFound('Color');
        return withFlag(color);
    }

    private async assertColorFree(
        scope: MasterScope,
        data: {name?: string; hexCode?: string},
        exceptId?: string,
    ) {
        if (!data.name && !data.hexCode) return;
        const clash = await prisma.color.findFirst({
            where: {
                AND: [
                    ownRows(scope),
                    {
                        OR: [
                            ...(data.name
                                ? [{name: {equals: data.name, mode: 'insensitive' as const}}]
                                : []),
                            ...(data.hexCode
                                ? [{hexCode: {equals: data.hexCode, mode: 'insensitive' as const}}]
                                : []),
                        ],
                    },
                ],
                ...(exceptId ? {NOT: {id: exceptId}} : {}),
            },
        });
        if (clash) {
            const byName = !!data.name && clash.name.toLowerCase() === data.name.toLowerCase();
            throw conflict(
                `A color with this ${byName ? 'name' : 'hex code'} already exists`,
                byName ? 'name' : 'hexCode',
            );
        }
    }

    public async createColor(scope: MasterScope, data: ColorInput) {
        await this.ready(scope);
        await this.assertColorFree(scope, data);
        return accountService.withRetry(async () => {
            const code = await uniqueCode(codeFrom(data.name), async (prefix) =>
                (
                    await prisma.color.findMany({
                        where: {code: {startsWith: prefix}},
                        select: {code: true},
                    })
                ).map((c) => c.code),
            );
            return prisma.color.create({
                data: {
                    companyId: scope.companyId,
                    shopId: scope.shopId ?? null,
                    name: data.name,
                    code,
                    hexCode: data.hexCode.toUpperCase(),
                    isActive: data.isActive ?? true,
                },
            });
        }, 'code');
    }

    public async updateColor(scope: MasterScope, id: string, data: ColorUpdate) {
        await this.ready(scope);
        const before = this.ownedRow(await prisma.color.findUnique({where: {id}}), scope, 'Color');
        await this.assertColorFree(
            scope,
            {
                name:
                    data.name && data.name.toLowerCase() !== before.name.toLowerCase()
                        ? data.name
                        : undefined,
                hexCode:
                    data.hexCode && data.hexCode.toUpperCase() !== before.hexCode.toUpperCase()
                        ? data.hexCode
                        : undefined,
            },
            id,
        );
        const after = await prisma.$transaction(async (tx) => {
            const row = await tx.color.update({
                where: {id},
                data: {...data, ...(data.hexCode ? {hexCode: data.hexCode.toUpperCase()} : {})},
            });
            // Variants are matched by name: the products using this colour follow the
            // rename, so saving them later keeps the same variants and their stock
            if (row.name !== before.name || row.hexCode !== before.hexCode) {
                await tx.productVariant.updateMany({
                    where: {
                        color: {equals: before.name, mode: 'insensitive'},
                        product: {colors: {some: {colorId: id}}},
                    },
                    data: {color: row.name, colorHex: row.hexCode},
                });
            }
            return row;
        });
        return {before, after};
    }

    public async deleteColor(scope: MasterScope, id: string) {
        await this.ready(scope);
        const color = this.ownedRow(await prisma.color.findUnique({where: {id}}), scope, 'Color');
        const used = await prisma.productColor.count({where: {colorId: id}});
        if (used) {
            throw new ApiError(
                httpStatus.CONFLICT,
                `This color is used by ${used} product(s); deactivate it instead`,
            );
        }
        await prisma.color.delete({where: {id}});
        return {before: color};
    }

    // ==========================================
    // 4. SIZES (per shop, D-02)
    // ==========================================

    public async listSizes(scope: MasterScope, query: MasterList) {
        await this.ready(scope);
        const where: Prisma.SizeWhereInput = {
            AND: [ownRows(scope), {OR: searchWhere(query.search, ['name', 'code'] as const)}],
            ...(query.active ? {isActive: query.active === 'true'} : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.size.findMany({where, ...listArgs(query)}),
            prisma.size.count({where}),
        ]);
        return toListResult(items.map(withFlag), total, query);
    }

    public async getSize(scope: MasterScope, id: string) {
        await this.ready(scope);
        const size = await prisma.size.findFirst({where: {id, ...ownRows(scope)}});
        if (!size) throw notFound('Size');
        return withFlag(size);
    }

    private async assertSizeNameFree(scope: MasterScope, name: string, exceptId?: string) {
        const clash = await prisma.size.findFirst({
            where: {
                name: {equals: name, mode: 'insensitive'},
                ...ownRows(scope),
                ...(exceptId ? {NOT: {id: exceptId}} : {}),
            },
            select: {id: true},
        });
        if (clash) throw conflict('A size with this name already exists');
    }

    public async createSize(scope: MasterScope, data: SizeInput) {
        await this.ready(scope);
        await this.assertSizeNameFree(scope, data.name);
        return accountService.withRetry(async () => {
            const code = await uniqueCode(codeFrom(data.name), async (prefix) =>
                (
                    await prisma.size.findMany({
                        where: {code: {startsWith: prefix}},
                        select: {code: true},
                    })
                ).map((s) => s.code),
            );
            return prisma.size.create({
                data: {
                    companyId: scope.companyId,
                    shopId: scope.shopId ?? null,
                    name: data.name,
                    code,
                    description: data.description,
                    displayOrder: data.displayOrder ?? 0,
                    isActive: data.isActive ?? true,
                },
            });
        }, 'code');
    }

    public async updateSize(scope: MasterScope, id: string, data: SizeUpdate) {
        await this.ready(scope);
        const before = this.ownedRow(await prisma.size.findUnique({where: {id}}), scope, 'Size');
        if (data.name && data.name.toLowerCase() !== before.name.toLowerCase()) {
            await this.assertSizeNameFree(scope, data.name, id);
        }
        const after = await prisma.$transaction(async (tx) => {
            const row = await tx.size.update({where: {id}, data});
            // Variants are matched by name: the products using this size follow the
            // rename, so saving them later keeps the same variants and their stock
            if (row.name !== before.name) {
                await tx.productVariant.updateMany({
                    where: {
                        size: {equals: before.name, mode: 'insensitive'},
                        product: {sizes: {some: {sizeId: id}}},
                    },
                    data: {size: row.name},
                });
            }
            return row;
        });
        return {before, after};
    }

    public async deleteSize(scope: MasterScope, id: string) {
        await this.ready(scope);
        const size = this.ownedRow(await prisma.size.findUnique({where: {id}}), scope, 'Size');
        const used = await prisma.productSize.count({where: {sizeId: id}});
        if (used) {
            throw new ApiError(
                httpStatus.CONFLICT,
                `This size is used by ${used} product(s); deactivate it instead`,
            );
        }
        await prisma.size.delete({where: {id}});
        return {before: size};
    }
}

export default new MasterService();
