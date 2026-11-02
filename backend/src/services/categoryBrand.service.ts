import httpStatus from 'http-status';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {ApiError} from '@utils/index';
import {listArgs, searchWhere, toListResult} from '../utils/list';
import {catalogValidation} from '@validations/index';
import accountService from './account.service';

type CategoryInput = z.infer<typeof catalogValidation.createCategorySchema>;
type CategoryUpdate = z.infer<typeof catalogValidation.updateCategorySchema>;
type BrandInput = z.infer<typeof catalogValidation.createBrandSchema>;
type BrandUpdate = z.infer<typeof catalogValidation.updateBrandSchema>;
type CatalogList = z.infer<typeof catalogValidation.catalogListSchema>;

/** "Men's Shirts & Tops" -> "MENS-SHIRTS-TOPS" */
const codeFrom = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'ITEM';

/** Unique code: BASE, then BASE-2, BASE-3... */
const uniqueCode = async (base: string, taken: (prefix: string) => Promise<string[]>) => {
    const used = new Set(await taken(base));
    if (!used.has(base)) return base;
    for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
};

/**
 * Categories: one global taxonomy, managed by the super admin, so the store
 * browses the same way for every company.
 * Brands: global ones (super admin) plus a company's own (company admin).
 */
class CategoryBrandService {
    // ---- Categories ----------------------------------------------------------

    public async listCategories(query: CatalogList) {
        const where: Prisma.CategoryWhereInput = {
            companyId: null,
            ...(query.active ? {isActive: query.active === 'true'} : {}),
            OR: searchWhere(query.search, ['name', 'code'] as const),
        };
        const [items, total] = await prisma.$transaction([
            prisma.category.findMany({
                where,
                include: {
                    parent: {select: {id: true, name: true}},
                    _count: {select: {products: {where: {deletedAt: null}}, children: true}},
                },
                ...listArgs(query),
            }),
            prisma.category.count({where}),
        ]);
        return toListResult(
            items.map(({_count, ...c}) => ({
                ...c,
                productCount: _count.products,
                childCount: _count.children,
            })),
            total,
            query,
        );
    }

    /** Active categories for product form pickers ("Men / Shirts") */
    public async categoryOptions() {
        const all = await prisma.category.findMany({
            where: {companyId: null, isActive: true},
            select: {id: true, name: true, parent: {select: {name: true}}},
            orderBy: [{displayOrder: 'asc'}, {name: 'asc'}],
        });
        return all.map((c) => ({
            id: c.id,
            name: c.parent ? `${c.parent.name} / ${c.name}` : c.name,
        }));
    }

    private async assertParent(parentId: string | undefined, selfId?: string) {
        if (!parentId) return;
        if (parentId === selfId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'A category cannot be its own parent', [
                {field: 'parentId', message: 'A category cannot be its own parent'},
            ]);
        }
        const parent = await prisma.category.findFirst({
            where: {id: parentId, companyId: null},
            select: {parentId: true},
        });
        // Two levels (e.g. Men > Shirts) keep the store navigation simple
        if (!parent || parent.parentId) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'Choose a top-level category as the parent',
                [{field: 'parentId', message: 'Choose a top-level category as the parent'}],
            );
        }
    }

    private async ensureNameFree(
        model: 'category' | 'brand',
        name: string,
        companyId: string | null,
        exceptId?: string,
    ) {
        const where = {
            name: {equals: name, mode: 'insensitive' as const},
            companyId,
            ...(exceptId ? {NOT: {id: exceptId}} : {}),
        };
        const clash =
            model === 'category'
                ? await prisma.category.findFirst({where, select: {id: true}})
                : await prisma.brand.findFirst({where, select: {id: true}});
        if (clash) {
            const message = `${model === 'category' ? 'A category' : 'A brand'} with this name already exists`;
            throw new ApiError(httpStatus.CONFLICT, message, [{field: 'name', message}]);
        }
    }

    public async createCategory(data: CategoryInput) {
        await this.ensureNameFree('category', data.name, null);
        await this.assertParent(data.parentId);
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
                data: {...data, displayOrder: data.displayOrder ?? 0, code},
            });
        }, 'code');
    }

    public async updateCategory(id: string, data: CategoryUpdate) {
        const before = await prisma.category.findFirst({where: {id, companyId: null}});
        if (!before) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        if (data.name) await this.ensureNameFree('category', data.name, null, id);
        if (data.parentId) {
            await this.assertParent(data.parentId, id);
            if (await prisma.category.count({where: {parentId: id}})) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    'A category with sub-categories cannot be moved under another',
                    [
                        {
                            field: 'parentId',
                            message: 'This category has sub-categories, so it must stay top-level',
                        },
                    ],
                );
            }
        }
        const after = await prisma.category.update({where: {id}, data});
        return {before, after};
    }

    /** Only unused categories can be deleted; others are deactivated instead */
    public async deleteCategory(id: string) {
        const category = await prisma.category.findFirst({
            where: {id, companyId: null},
            include: {_count: {select: {products: true, children: true}}},
        });
        if (!category) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
        if (category._count.products || category._count.children) {
            throw new ApiError(
                httpStatus.CONFLICT,
                'This category has products or sub-categories. Deactivate it instead.',
            );
        }
        await prisma.category.delete({where: {id}});
        return {before: category};
    }

    // ---- Brands --------------------------------------------------------------

    /** companyId undefined = super admin (global brands only) */
    public async listBrands(companyId: string | undefined, query: CatalogList) {
        const where: Prisma.BrandWhereInput = {
            ...(companyId ? {OR: [{companyId: null}, {companyId}]} : {companyId: null}),
            ...(query.active ? {isActive: query.active === 'true'} : {}),
            ...(query.search
                ? {AND: [{OR: searchWhere(query.search, ['name', 'code'] as const)}]}
                : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.brand.findMany({
                where,
                include: {_count: {select: {products: {where: {deletedAt: null}}}}},
                orderBy: {[query.sortBy === 'displayOrder' ? 'name' : query.sortBy]: query.sortDir},
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            prisma.brand.count({where}),
        ]);
        return toListResult(
            items.map(({_count, ...b}) => ({
                ...b,
                productCount: _count.products,
                isGlobal: !b.companyId,
            })),
            total,
            query,
        );
    }

    public async brandOptions(companyId?: string) {
        return prisma.brand.findMany({
            where: {isActive: true, OR: [{companyId: null}, ...(companyId ? [{companyId}] : [])]},
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        });
    }

    public async createBrand(companyId: string | null, data: BrandInput) {
        await this.ensureNameFree('brand', data.name, companyId);
        return accountService.withRetry(async () => {
            const code = await uniqueCode(codeFrom(data.name), async (prefix) =>
                (
                    await prisma.brand.findMany({
                        where: {code: {startsWith: prefix}},
                        select: {code: true},
                    })
                ).map((b) => b.code),
            );
            return prisma.brand.create({data: {...data, code, companyId}});
        }, 'code');
    }

    /** Each side edits only its own brands (global vs company) */
    public async updateBrand(companyId: string | null, id: string, data: BrandUpdate) {
        const before = await prisma.brand.findFirst({where: {id, companyId}});
        if (!before) throw new ApiError(httpStatus.NOT_FOUND, 'Brand not found');
        if (data.name) await this.ensureNameFree('brand', data.name, companyId, id);
        const after = await prisma.brand.update({where: {id}, data});
        return {before, after};
    }

    /** Is this category / brand usable by the company? (product form) */
    public async assertUsable(companyId: string, categoryId?: string, brandId?: string) {
        if (categoryId) {
            const ok = await prisma.category.findFirst({
                where: {id: categoryId, companyId: null, isActive: true},
            });
            if (!ok) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Select an active category', [
                    {field: 'categoryId', message: 'Select an active category'},
                ]);
            }
        }
        if (brandId) {
            const ok = await prisma.brand.findFirst({
                where: {id: brandId, isActive: true, OR: [{companyId: null}, {companyId}]},
            });
            if (!ok) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Select an active brand', [
                    {field: 'brandId', message: 'Select an active brand'},
                ]);
            }
        }
    }
}

export default new CategoryBrandService();
