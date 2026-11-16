import fs from 'fs/promises';
import {Request} from 'express';
import httpStatus from 'http-status';
import {aiPreviewService, auditService, shopProductService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {shopProductValidation as v} from '@validations/index';
import {storeUpload} from '../utils/fileStore';
import {Role} from '@prisma/client';
import {ProductScope, ShopScope} from '../services/shopProduct.service';

/*
 * Shop-side products. Products belong to the signed-in user's shop; the
 * scope is never taken from the request.
 */
const shopOf = (req: Request): ShopScope => {
    const {companyId, shopId} = req.user;
    if (!companyId || !shopId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    }
    return {companyId, shopId};
};

/** AI photo tools: a shop works on its own products, a company admin on any product of the company */
const photoScopeOf = (req: Request): ProductScope =>
    req.user.role === Role.ADMIN && req.user.companyId ? {companyId: req.user.companyId} : shopOf(req);

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

const listProducts = catchAsync(async (req, res) => {
    const query = v.shopProductListSchema.parse(req.query);
    return ok(
        res,
        await shopProductService.list(shopOf(req), query),
        'Products fetched successfully',
    );
});

const getProduct = catchAsync(async (req, res) => {
    const {id} = v.idSchema.parse(req.params);
    return ok(res, await shopProductService.get(shopOf(req), id), 'Product fetched successfully');
});

/**
 * Form data sends every field as text: list fields (sizes, colours, tags)
 * come as JSON arrays or repeated keys. JSON bodies pass through unchanged.
 */
const LIST_FIELDS = ['sizeIds', 'colorIds', 'tags'];
const fromForm = (body: Record<string, unknown>) => {
    const out: Record<string, unknown> = {...body};
    for (const key of LIST_FIELDS) {
        const value = out[key];
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                out[key] = Array.isArray(parsed) ? parsed : [value];
            } catch {
                out[key] = value ? [value] : [];
            }
        }
    }
    return out;
};

const createProduct = catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    // Check the fields before keeping any photo; a rejected form leaves no files behind
    const parsed = v.createShopProductSchema.safeParse(fromForm(req.body ?? {}));
    if (!parsed.success) {
        await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => undefined)));
        throw parsed.error;
    }
    const data = parsed.data;
    const {after} = await auditService.track(
        req,
        {action: 'product.create', module: 'catalog'},
        async () => {
            const created = await shopProductService.create(scope, req.user.id, data);
            if (!files.length) return {after: created};
            const urls = await Promise.all(files.map((file) => storeUpload(req, file, 'products')));
            return {after: await shopProductService.addImages(scope, created.id, urls)};
        },
    );
    return ok(
        res,
        after,
        files.length ? `Product created with ${files.length} photo${files.length > 1 ? 's' : ''}` : 'Product created successfully',
        httpStatus.CREATED,
    );
});

const updateProduct = catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const {id} = v.idSchema.parse(req.params);
    const data = v.updateShopProductSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'product.update', module: 'catalog', targetId: id},
        () => shopProductService.update(scope, id, data),
    );
    return ok(res, after, 'Product updated successfully');
});

const deleteProduct = catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const {id} = v.idSchema.parse(req.params);
    await auditService.track(req, {action: 'product.delete', module: 'catalog', targetId: id}, () =>
        shopProductService.delete(scope, id),
    );
    return ok(res, {}, 'Product deleted successfully');
});

// ---- Images ----

const uploadImages = catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const {id} = v.idSchema.parse(req.params);
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw new ApiError(httpStatus.BAD_REQUEST, 'Choose at least one image');
    // Check the product first so files are not stored for nothing
    await shopProductService.get(scope, id);
    const urls = await Promise.all(files.map((file) => storeUpload(req, file, 'products')));
    return ok(
        res,
        await shopProductService.addImages(scope, id, urls),
        `${files.length} image(s) added`,
    );
});

const updateImage = catchAsync(async (req, res) => {
    const {id, imageId} = v.imageIdSchema.parse(req.params);
    const data = v.imageUpdateSchema.parse(req.body);
    return ok(
        res,
        await shopProductService.updateImage(shopOf(req), id, imageId, data),
        'Image updated',
    );
});

const deleteImage = catchAsync(async (req, res) => {
    const {id, imageId} = v.imageIdSchema.parse(req.params);
    return ok(res, await shopProductService.deleteImage(shopOf(req), id, imageId), 'Image removed');
});

// ---- AI color previews ----

const generatePreviews = catchAsync(async (req, res) => {
    const scope = photoScopeOf(req);
    const {id} = v.idSchema.parse(req.params);
    const data = v.generatePreviewSchema.parse(req.body);
    const {product, failed, error} = await aiPreviewService.generate(req, scope, id, data);
    const message = failed
        ? (error ??
          `${data.colorIds.length - failed} of ${data.colorIds.length} preview(s) generated`)
        : 'Preview(s) generated';
    return ok(res, product, message);
});

const cleanBackground = catchAsync(async (req, res) => {
    const scope = photoScopeOf(req);
    const {id, imageId} = v.imageIdSchema.parse(req.params);
    return ok(res, await aiPreviewService.cleanBackground(req, scope, id, imageId), 'Clean photo added and set as the main photo');
});

const professionalPhoto = catchAsync(async (req, res) => {
    const scope = photoScopeOf(req);
    const {id, imageId} = v.imageIdSchema.parse(req.params);
    const {style, details} = v.professionalPhotoSchema.parse(req.body);
    return ok(res, await aiPreviewService.professionalPhoto(req, scope, id, imageId, style, details), 'Professional photo added and set as the main photo');
});

/** Whether AI photos (Cloudflare keys) are set up, so the panel can say so */
const aiStatus = catchAsync(async (_req, res) => ok(res, {ready: aiPreviewService.aiReady}, 'AI status'));

const deletePreview = catchAsync(async (req, res) => {
    const scope = photoScopeOf(req);
    const {id, previewId} = v.previewIdSchema.parse(req.params);
    const {after} = await aiPreviewService.remove(scope, id, previewId);
    return ok(res, after, 'Preview removed');
});

export default {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImages,
    updateImage,
    deleteImage,
    generatePreviews,
    cleanBackground,
    professionalPhoto,
    aiStatus,
    deletePreview,
};
