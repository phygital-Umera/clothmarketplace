import httpStatus from 'http-status';
import {Role} from '@prisma/client';
import {auditService, categoryBrandService, productService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {catalogValidation as v} from '@validations/index';
import {storeUpload} from '../utils/fileStore';

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

/** Company of the signed-in user; null for the super admin (global records) */
const ownerOf = (req: Parameters<Parameters<typeof catchAsync>[0]>[0]) =>
    req.user.role === Role.SUPER_ADMIN ? null : (req.user.companyId ?? null);

// ---- Categories (super admin manages; everyone reads the active ones) -----

const listCategories = catchAsync(async (req, res) => {
    const query = v.catalogListSchema.parse(req.query);
    return ok(
        res,
        await categoryBrandService.listCategories(query),
        'Categories fetched successfully',
    );
});

const categoryOptions = catchAsync(async (req, res) =>
    ok(res, await categoryBrandService.categoryOptions(), 'Categories fetched successfully'),
);

const createCategory = catchAsync(async (req, res) => {
    const data = v.createCategorySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'category.create', module: 'catalog'},
        async () => ({
            after: await categoryBrandService.createCategory(data),
        }),
    );
    return ok(res, after, 'Category created successfully', httpStatus.CREATED);
});

const updateCategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateCategorySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'category.update', module: 'catalog', targetId: id},
        () => categoryBrandService.updateCategory(id, data),
    );
    return ok(res, after, 'Category updated successfully');
});

const deleteCategory = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    await auditService.track(
        req,
        {action: 'category.delete', module: 'catalog', targetId: id},
        () => categoryBrandService.deleteCategory(id),
    );
    return ok(res, {}, 'Category deleted');
});

// ---- Brands (super admin: global; company admin: own) ----------------------

const listBrands = catchAsync(async (req, res) => {
    const query = v.catalogListSchema.parse(req.query);
    return ok(
        res,
        await categoryBrandService.listBrands(ownerOf(req) ?? undefined, query),
        'Brands fetched successfully',
    );
});

const brandOptions = catchAsync(async (req, res) =>
    ok(
        res,
        await categoryBrandService.brandOptions(req.user.companyId ?? undefined),
        'Brands fetched successfully',
    ),
);

const createBrand = catchAsync(async (req, res) => {
    const data = v.createBrandSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'brand.create', module: 'catalog'},
        async () => ({
            after: await categoryBrandService.createBrand(ownerOf(req), data),
        }),
    );
    return ok(res, after, 'Brand created successfully', httpStatus.CREATED);
});

const updateBrand = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateBrandSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'brand.update', module: 'catalog', targetId: id},
        () => categoryBrandService.updateBrand(ownerOf(req), id, data),
    );
    return ok(res, after, 'Brand updated successfully');
});

// ---- Products ---------------------------------------------------------------

const listProducts = catchAsync(async (req, res) => {
    const query = v.productListSchema.parse(req.query);
    return ok(res, await productService.list(req.user, query), 'Products fetched successfully');
});

const getProduct = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    return ok(res, await productService.get(req.user, id), 'Product fetched successfully');
});

const createProduct = catchAsync(async (req, res) => {
    const data = v.createProductSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'product.create', module: 'products'},
        async () => ({
            after: await productService.create(req.user, data),
        }),
    );
    return ok(res, after, 'Product created as a draft', httpStatus.CREATED);
});

const updateProduct = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateProductSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'product.update', module: 'products', targetId: id},
        () => productService.update(req.user, id, data),
    );
    return ok(res, after, 'Product updated successfully');
});

const setProductStatus = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const {status, reason} = v.productStatusSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: `product.${status.toLowerCase()}`, module: 'products', targetId: id, reason},
        () => productService.setStatus(req.user, id, status),
    );
    return ok(res, after, `Product ${status.toLowerCase()}`);
});

const deleteProduct = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    await auditService.track(
        req,
        {action: 'product.delete', module: 'products', targetId: id},
        () => productService.delete(req.user, id),
    );
    return ok(res, {}, 'Product deleted');
});

const uploadImages = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose at least one image');
    const urls = await Promise.all(files.map((file) => storeUpload(req, file, 'products')));
    const product = await productService.addImages(req.user, id, urls);
    return ok(res, product, `${files.length} image(s) added`);
});

const updateImage = catchAsync(async (req, res) => {
    const {id, imageId} = v.imageIdSchema.parse(req.params);
    const data = v.imageUpdateSchema.parse(req.body);
    return ok(res, await productService.updateImage(req.user, id, imageId, data), 'Image updated');
});

const deleteImage = catchAsync(async (req, res) => {
    const {id, imageId} = v.imageIdSchema.parse(req.params);
    return ok(res, await productService.deleteImage(req.user, id, imageId), 'Image removed');
});

export default {
    listCategories,
    categoryOptions,
    createCategory,
    updateCategory,
    deleteCategory,
    listBrands,
    brandOptions,
    createBrand,
    updateBrand,
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    setProductStatus,
    deleteProduct,
    uploadImages,
    updateImage,
    deleteImage,
};
