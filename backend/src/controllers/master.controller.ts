import httpStatus from 'http-status';
import {catchAsync, ApiResponse} from '@utils/index';
import {auditService, masterService} from '@services/index';
import {masterValidation as v} from '@validations/index';
import {ApiError} from '@utils/index';
import {Request} from 'express';
/** Masters belong to the signed-in user's company */
const companyOf = (req: Request) => {
    const companyId = req.user?.companyId;
    if (!companyId) throw new ApiError(httpStatus.FORBIDDEN, 'This account is not linked to a company');
    return companyId;
};

/** Sizes and colours belong to the open shop (D-02) */
const shopScopeOf = (req: Request) => ({
    companyId: companyOf(req),
    shopId: req.user?.shopId ?? null,
});


const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

// ==========================================
// 1. CATEGORIES
// ==========================================

const listCategories = catchAsync(async (req, res) => {
    const query = v.masterListSchema.parse(req.query);
    return ok(res, await masterService.listCategories(companyOf(req), query), 'Categories fetched successfully');
});

const getCategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    return ok(res, await masterService.getCategory(companyOf(req), id), 'Category fetched successfully');
});

const categoryOptions = catchAsync(async (req, res) => {
    return ok(res, await masterService.categoryOptions(companyOf(req)), 'Category options fetched successfully');
});

const createCategory = catchAsync(async (req, res) => {
    const data = v.createCategorySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'category.create', module: 'catalog'},
        async () => ({after: await masterService.createCategory(companyOf(req), data)}),
    );
    return ok(res, after, 'Category created successfully', httpStatus.CREATED);
});

const updateCategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateCategorySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'category.update', module: 'catalog', targetId: id},
        () => masterService.updateCategory(companyOf(req), id, data),
    );
    return ok(res, after, 'Category updated successfully');
});

const deleteCategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    await auditService.track(
        req,
        {action: 'category.delete', module: 'catalog', targetId: id},
        () => masterService.deleteCategory(companyOf(req), id),
    );
    return ok(res, {}, 'Category deleted successfully');
});

// ==========================================
// 2. SUBCATEGORIES
// ==========================================

const listSubcategories = catchAsync(async (req, res) => {
    const query = v.masterListSchema.parse(req.query);
    return ok(res, await masterService.listSubcategories(companyOf(req), query), 'Subcategories fetched successfully');
});

const getSubcategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    return ok(res, await masterService.getSubcategory(companyOf(req), id), 'Subcategory fetched successfully');
});

const createSubcategory = catchAsync(async (req, res) => {
    const data = v.createSubcategorySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'subcategory.create', module: 'catalog'},
        async () => ({after: await masterService.createSubcategory(companyOf(req), data)}),
    );
    return ok(res, after, 'Subcategory created successfully', httpStatus.CREATED);
});

const updateSubcategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateSubcategorySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'subcategory.update', module: 'catalog', targetId: id},
        () => masterService.updateSubcategory(companyOf(req), id, data),
    );
    return ok(res, after, 'Subcategory updated successfully');
});

const deleteSubcategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    await auditService.track(
        req,
        {action: 'subcategory.delete', module: 'catalog', targetId: id},
        () => masterService.deleteSubcategory(companyOf(req), id),
    );
    return ok(res, {}, 'Subcategory deleted successfully');
});

// ==========================================
// 3. COLORS
// ==========================================

const listColors = catchAsync(async (req, res) => {
    const query = v.masterListSchema.parse(req.query);
    return ok(res, await masterService.listColors(shopScopeOf(req), query), 'Colors fetched successfully');
});

const getColor = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    return ok(res, await masterService.getColor(shopScopeOf(req), id), 'Color fetched successfully');
});

const createColor = catchAsync(async (req, res) => {
    const data = v.createColorSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'color.create', module: 'catalog'},
        async () => ({after: await masterService.createColor(shopScopeOf(req), data)}),
    );
    return ok(res, after, 'Color created successfully', httpStatus.CREATED);
});

const updateColor = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateColorSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'color.update', module: 'catalog', targetId: id},
        () => masterService.updateColor(shopScopeOf(req), id, data),
    );
    return ok(res, after, 'Color updated successfully');
});

const deleteColor = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    await auditService.track(
        req,
        {action: 'color.delete', module: 'catalog', targetId: id},
        () => masterService.deleteColor(shopScopeOf(req), id),
    );
    return ok(res, {}, 'Color deleted successfully');
});

// ==========================================
// 4. SIZES
// ==========================================

const listSizes = catchAsync(async (req, res) => {
    const query = v.masterListSchema.parse(req.query);
    return ok(res, await masterService.listSizes(shopScopeOf(req), query), 'Sizes fetched successfully');
});

const getSize = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    return ok(res, await masterService.getSize(shopScopeOf(req), id), 'Size fetched successfully');
});

const createSize = catchAsync(async (req, res) => {
    const data = v.createSizeSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'size.create', module: 'catalog'},
        async () => ({after: await masterService.createSize(shopScopeOf(req), data)}),
    );
    return ok(res, after, 'Size created successfully', httpStatus.CREATED);
});

const updateSize = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateSizeSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'size.update', module: 'catalog', targetId: id},
        () => masterService.updateSize(shopScopeOf(req), id, data),
    );
    return ok(res, after, 'Size updated successfully');
});

const deleteSize = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    await auditService.track(
        req,
        {action: 'size.delete', module: 'catalog', targetId: id},
        () => masterService.deleteSize(shopScopeOf(req), id),
    );
    return ok(res, {}, 'Size deleted successfully');
});

export default {
    listCategories,
    getCategory,
    categoryOptions,
    createCategory,
    updateCategory,
    deleteCategory,
    listSubcategories,
    getSubcategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    listColors,
    getColor,
    createColor,
    updateColor,
    deleteColor,
    listSizes,
    getSize,
    createSize,
    updateSize,
    deleteSize,
};

