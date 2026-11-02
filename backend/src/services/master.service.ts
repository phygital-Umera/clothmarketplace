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

class MasterService {
    // ==========================================
    // 1. CATEGORY MANAGEMENT
    // ==========================================

    public async listCategories(query: MasterList) {
        const where: Prisma.CategoryWhereInput = {
            ...(query.active ? {isActive: query.active === 'true'} : {}),
            OR: searchWhere(query.search, ['name', 'code'] as const),
        };
        const [items, total] = await prisma.$transaction([
            prisma.category.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            products: {where: {deletedAt: null}},
                            subcategories: true,
                        },
                    },
                },
                ...listArgs(query),
            }),
            prisma.category.count({where}),
        ]);
        return toListResult(
            items.map(({_count, ...c}) => ({
                ...c,
                productCount: _count.products,
                subcategoryCount: _count.subcategories,
            })),
            total,
            query,
        );
    }

    public async getCategory(id: string) {
        const category = await prisma.category.findUnique({
            where: {id},
            include: {
                subcategories: {
                    select: {id: true, name: true, code: true, isActive: true},
                    orderBy: {name: 'asc'},
                },
                _count: {
                    select: {products: {where: {deletedAt: null}}, subcategories: true},
                },
            },
        });
        if (!category) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        return {
            ...category,
            productCount: category._count.products,
            subcategoryCount: category._count.subcategories,
        };
    }

    public async categoryOptions() {
        return prisma.category.findMany({
            where: {isActive: true},
            select: {id: true, name: true, code: true},
            orderBy: [{displayOrder: 'asc'}, {name: 'asc'}],
        });
    }

    public async createCategory(data: CategoryInput) {
        const existing = await prisma.category.findFirst({
            where: {name: {equals: data.name, mode: 'insensitive'}},
        });
        if (existing) {
            throw new ApiError(httpStatus.CONFLICT, 'A category with this name already exists', [
                {field: 'name', message: 'A category with this name already exists'},
            ]);
        }

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
                    name: data.name,
                    code,
                    description: data.description,
                    displayOrder: data.displayOrder ?? 0,
                    isActive: data.isActive ?? true,
                },
            });
        }, 'code');
    }

    public async updateCategory(id: string, data: CategoryUpdate) {
        const before = await prisma.category.findUnique({where: {id}});
        if (!before) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');

        if (data.name && data.name.toLowerCase() !== before.name.toLowerCase()) {
            const clash = await prisma.category.findFirst({
                where: {
                    name: {equals: data.name, mode: 'insensitive'},
                    NOT: {id},
                },
            });
            if (clash) {
                throw new ApiError(httpStatus.CONFLICT, 'A category with this name already exists', [
                    {field: 'name', message: 'A category with this name already exists'},
                ]);
            }
        }

        const after = await prisma.category.update({
            where: {id},
            data,
        });
        return {before, after};
    }

    public async deleteCategory(id: string) {
        const category = await prisma.category.findUnique({
            where: {id},
            include: {
                _count: {
                    select: {
                        products: true,
                        subcategories: true,
                    },
                },
            },
        });
        if (!category) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        if (category._count.products > 0 || category._count.subcategories > 0) {
            throw new ApiError(
                httpStatus.CONFLICT,
                `Cannot delete: Category has ${category._count.subcategories} subcategories and ${category._count.products} products. Delete or reassign them first, or deactivate the category.`,
            );
        }
        await prisma.category.delete({where: {id}});
        return {before: category};
    }

    // ==========================================
    // 2. SUBCATEGORY MANAGEMENT
    // ==========================================

    public async listSubcategories(query: MasterList) {
        const where: Prisma.SubcategoryWhereInput = {
            ...(query.active ? {isActive: query.active === 'true'} : {}),
            ...(query.categoryId ? {categoryId: query.categoryId} : {}),
            OR: searchWhere(query.search, ['name', 'code'] as const),
        };
        const [items, total] = await prisma.$transaction([
            prisma.subcategory.findMany({
                where,
                include: {
                    category: {select: {id: true, name: true, code: true}},
                },
                ...listArgs(query),
            }),
            prisma.subcategory.count({where}),
        ]);
        return toListResult(items, total, query);
    }

    public async getSubcategory(id: string) {
        const sub = await prisma.subcategory.findUnique({
            where: {id},
            include: {
                category: {select: {id: true, name: true, code: true}},
            },
        });
        if (!sub) throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory not found');
        return sub;
    }

    public async createSubcategory(data: SubcategoryInput) {
        // 1. Verify parent category exists in DB
        const parentCategory = await prisma.category.findUnique({
            where: {id: data.categoryId},
        });
        if (!parentCategory) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Selected parent category does not exist', [
                {field: 'categoryId', message: 'Selected parent category does not exist'},
            ]);
        }

        // 2. Check duplicate name under same category
        const existing = await prisma.subcategory.findFirst({
            where: {
                categoryId: data.categoryId,
                name: {equals: data.name, mode: 'insensitive'},
            },
        });
        if (existing) {
            throw new ApiError(
                httpStatus.CONFLICT,
                'A subcategory with this name already exists in this category',
                [{field: 'name', message: 'Subcategory name already exists in this category'}],
            );
        }

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
                    categoryId: data.categoryId,
                    name: data.name,
                    code,
                    description: data.description,
                    displayOrder: data.displayOrder ?? 0,
                    isActive: data.isActive ?? true,
                },
                include: {
                    category: {select: {id: true, name: true, code: true}},
                },
            });
        }, 'code');
    }

    public async updateSubcategory(id: string, data: SubcategoryUpdate) {
        const before = await prisma.subcategory.findUnique({where: {id}});
        if (!before) throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory not found');

        const targetCategoryId = data.categoryId ?? before.categoryId;

        // Verify parent category if updated
        if (data.categoryId && data.categoryId !== before.categoryId) {
            const parent = await prisma.category.findUnique({where: {id: data.categoryId}});
            if (!parent) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Selected parent category does not exist', [
                    {field: 'categoryId', message: 'Selected parent category does not exist'},
                ]);
            }
        }

        if (data.name && (data.name.toLowerCase() !== before.name.toLowerCase() || (data.categoryId && data.categoryId !== before.categoryId))) {
            const clash = await prisma.subcategory.findFirst({
                where: {
                    categoryId: targetCategoryId,
                    name: {equals: data.name, mode: 'insensitive'},
                    NOT: {id},
                },
            });
            if (clash) {
                throw new ApiError(
                    httpStatus.CONFLICT,
                    'A subcategory with this name already exists in this category',
                    [{field: 'name', message: 'Subcategory name already exists in this category'}],
                );
            }
        }

        const after = await prisma.subcategory.update({
            where: {id},
            data,
            include: {
                category: {select: {id: true, name: true, code: true}},
            },
        });
        return {before, after};
    }

    public async deleteSubcategory(id: string) {
        const sub = await prisma.subcategory.findUnique({where: {id}});
        if (!sub) throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory not found');
        await prisma.subcategory.delete({where: {id}});
        return {before: sub};
    }

    // ==========================================
    // 3. COLOR MANAGEMENT
    // ==========================================

    public async listColors(query: MasterList) {
        const where: Prisma.ColorWhereInput = {
            ...(query.active ? {isActive: query.active === 'true'} : {}),
            OR: searchWhere(query.search, ['name', 'code', 'hexCode'] as const),
        };
        const [items, total] = await prisma.$transaction([
            prisma.color.findMany({
                where,
                ...listArgs(query),
            }),
            prisma.color.count({where}),
        ]);
        return toListResult(items, total, query);
    }

    public async getColor(id: string) {
        const color = await prisma.color.findUnique({where: {id}});
        if (!color) throw new ApiError(httpStatus.NOT_FOUND, 'Color not found');
        return color;
    }

    public async createColor(data: ColorInput) {
        const existing = await prisma.color.findFirst({
            where: {
                OR: [
                    {name: {equals: data.name, mode: 'insensitive'}},
                    {hexCode: {equals: data.hexCode, mode: 'insensitive'}},
                ],
            },
        });
        if (existing) {
            const field = existing.name.toLowerCase() === data.name.toLowerCase() ? 'name' : 'hexCode';
            throw new ApiError(httpStatus.CONFLICT, `Color with this ${field === 'name' ? 'name' : 'hex code'} already exists`, [
                {field, message: `Color with this ${field === 'name' ? 'name' : 'hex code'} already exists`},
            ]);
        }

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
                    name: data.name,
                    code,
                    hexCode: data.hexCode.toUpperCase(),
                    isActive: data.isActive ?? true,
                },
            });
        }, 'code');
    }

    public async updateColor(id: string, data: ColorUpdate) {
        const before = await prisma.color.findUnique({where: {id}});
        if (!before) throw new ApiError(httpStatus.NOT_FOUND, 'Color not found');

        if (data.name || data.hexCode) {
            const clash = await prisma.color.findFirst({
                where: {
                    OR: [
                        data.name ? {name: {equals: data.name, mode: 'insensitive'}} : {},
                        data.hexCode ? {hexCode: {equals: data.hexCode, mode: 'insensitive'}} : {},
                    ],
                    NOT: {id},
                },
            });
            if (clash) {
                const clashField = data.name && clash.name.toLowerCase() === data.name.toLowerCase() ? 'name' : 'hexCode';
                throw new ApiError(
                    httpStatus.CONFLICT,
                    `Color with this ${clashField === 'name' ? 'name' : 'hex code'} already exists`,
                    [{field: clashField, message: `Color with this ${clashField === 'name' ? 'name' : 'hex code'} already exists`}],
                );
            }
        }

        const after = await prisma.color.update({
            where: {id},
            data: {
                ...data,
                ...(data.hexCode ? {hexCode: data.hexCode.toUpperCase()} : {}),
            },
        });
        return {before, after};
    }

    public async deleteColor(id: string) {
        const color = await prisma.color.findUnique({where: {id}});
        if (!color) throw new ApiError(httpStatus.NOT_FOUND, 'Color not found');
        await prisma.color.delete({where: {id}});
        return {before: color};
    }

    // ==========================================
    // 4. SIZE MANAGEMENT
    // ==========================================

    public async listSizes(query: MasterList) {
        const where: Prisma.SizeWhereInput = {
            ...(query.active ? {isActive: query.active === 'true'} : {}),
            OR: searchWhere(query.search, ['name', 'code'] as const),
        };
        const [items, total] = await prisma.$transaction([
            prisma.size.findMany({
                where,
                ...listArgs(query),
            }),
            prisma.size.count({where}),
        ]);
        return toListResult(items, total, query);
    }

    public async getSize(id: string) {
        const size = await prisma.size.findUnique({where: {id}});
        if (!size) throw new ApiError(httpStatus.NOT_FOUND, 'Size not found');
        return size;
    }

    public async createSize(data: SizeInput) {
        const existing = await prisma.size.findFirst({
            where: {name: {equals: data.name, mode: 'insensitive'}},
        });
        if (existing) {
            throw new ApiError(httpStatus.CONFLICT, 'A size with this name already exists', [
                {field: 'name', message: 'A size with this name already exists'},
            ]);
        }

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
                    name: data.name,
                    code,
                    description: data.description,
                    displayOrder: data.displayOrder ?? 0,
                    isActive: data.isActive ?? true,
                },
            });
        }, 'code');
    }

    public async updateSize(id: string, data: SizeUpdate) {
        const before = await prisma.size.findUnique({where: {id}});
        if (!before) throw new ApiError(httpStatus.NOT_FOUND, 'Size not found');

        if (data.name && data.name.toLowerCase() !== before.name.toLowerCase()) {
            const clash = await prisma.size.findFirst({
                where: {
                    name: {equals: data.name, mode: 'insensitive'},
                    NOT: {id},
                },
            });
            if (clash) {
                throw new ApiError(httpStatus.CONFLICT, 'A size with this name already exists', [
                    {field: 'name', message: 'A size with this name already exists'},
                ]);
            }
        }

        const after = await prisma.size.update({
            where: {id},
            data,
        });
        return {before, after};
    }

    public async deleteSize(id: string) {
        const size = await prisma.size.findUnique({where: {id}});
        if (!size) throw new ApiError(httpStatus.NOT_FOUND, 'Size not found');
        await prisma.size.delete({where: {id}});
        return {before: size};
    }
}

export default new MasterService();

