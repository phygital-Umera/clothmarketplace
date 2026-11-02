import {Request} from 'express';
import httpStatus from 'http-status';
import {Role, OfferType, OfferApplicableOn} from '@prisma/client';
import {promotionService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {Scope} from '../services/account.service';

const scopeOf = (req: Request): Scope => {
    const {role, companyId, branchId, shopId} = req.user;
    if (role === Role.SUPER_ADMIN) return {};
    if (!companyId)
        throw new ApiError(httpStatus.FORBIDDEN, 'No company is linked to this account');
    if (role === Role.ADMIN) return {companyId};
    return {companyId, branchId: branchId ?? undefined, shopId: shopId ?? undefined};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

const parseArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return val.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};

// =========================================================
// 1. DASHBOARD
// =========================================================
export const getDashboard = catchAsync(async (req, res) => {
    const result = await promotionService.getDashboard(scopeOf(req));
    return ok(res, result, 'Promotions dashboard fetched successfully');
});

// =========================================================
// 2. OFFERS
// =========================================================
export const listOffers = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const type = req.query.type as OfferType | undefined;
    const applicableOn = req.query.applicableOn as OfferApplicableOn | undefined;

    const result = await promotionService.listOffers(scopeOf(req), {
        page,
        limit,
        search,
        status,
        type,
        applicableOn,
    });
    return ok(res, result, 'Offers fetched successfully');
});

export const getOffer = catchAsync(async (req, res) => {
    const {id} = req.params;
    const offer = await promotionService.getOffer(scopeOf(req), id);
    return ok(res, offer, 'Offer fetched successfully');
});

export const createOffer = catchAsync(async (req, res) => {
    const categoryIds = parseArray(req.body.categoryIds);
    const subcategoryIds = parseArray(req.body.subcategoryIds);
    const productIds = parseArray(req.body.productIds);

    const data = {
        name: req.body.name,
        description: req.body.description,
        type: req.body.type as OfferType,
        discountValue: Number(req.body.discountValue),
        applicableOn: req.body.applicableOn as OfferApplicableOn,
        minOrderValue: req.body.minOrderValue != null ? Number(req.body.minOrderValue) : 0,
        maxDiscountLimit: req.body.maxDiscountLimit ? Number(req.body.maxDiscountLimit) : undefined,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        isActive: req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === undefined,
        categoryIds,
        subcategoryIds,
        productIds,
        bannerUrl: req.body.bannerUrl,
    };

    const offer = await promotionService.createOffer(scopeOf(req), data, req.file, req);
    return ok(res, offer, 'Offer created successfully', httpStatus.CREATED);
});

export const updateOffer = catchAsync(async (req, res) => {
    const {id} = req.params;

    const categoryIds = req.body.categoryIds !== undefined ? parseArray(req.body.categoryIds) : undefined;
    const subcategoryIds = req.body.subcategoryIds !== undefined ? parseArray(req.body.subcategoryIds) : undefined;
    const productIds = req.body.productIds !== undefined ? parseArray(req.body.productIds) : undefined;

    const data = {
        name: req.body.name,
        description: req.body.description,
        type: req.body.type as OfferType | undefined,
        discountValue: req.body.discountValue != null ? Number(req.body.discountValue) : undefined,
        applicableOn: req.body.applicableOn as OfferApplicableOn | undefined,
        minOrderValue: req.body.minOrderValue != null ? Number(req.body.minOrderValue) : undefined,
        maxDiscountLimit: req.body.maxDiscountLimit !== undefined ? (req.body.maxDiscountLimit ? Number(req.body.maxDiscountLimit) : null) : undefined,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : undefined,
        removeBanner: req.body.removeBanner === 'true' || req.body.removeBanner === true,
        bannerUrl: req.body.bannerUrl,
        categoryIds,
        subcategoryIds,
        productIds,
    };

    const updated = await promotionService.updateOffer(scopeOf(req), id, data, req.file, req);
    return ok(res, updated, 'Offer updated successfully');
});

export const toggleOfferStatus = catchAsync(async (req, res) => {
    const {id} = req.params;
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
    const updated = await promotionService.toggleOffer(scopeOf(req), id, isActive);
    return ok(res, updated, 'Offer status updated successfully');
});

export const deleteOffer = catchAsync(async (req, res) => {
    const {id} = req.params;
    const result = await promotionService.deleteOffer(scopeOf(req), id);
    return ok(res, result, 'Offer deleted successfully');
});

// =========================================================
// 3. COUPONS
// =========================================================
export const listCoupons = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const search = req.query.search ? String(req.query.search) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const type = req.query.type as OfferType | undefined;

    const result = await promotionService.listCoupons(scopeOf(req), {
        page,
        limit,
        search,
        status,
        type,
    });
    return ok(res, result, 'Coupons fetched successfully');
});

export const getCoupon = catchAsync(async (req, res) => {
    const {id} = req.params;
    const coupon = await promotionService.getCoupon(scopeOf(req), id);
    return ok(res, coupon, 'Coupon fetched successfully');
});

export const createCoupon = catchAsync(async (req, res) => {
    const data = {
        code: req.body.code,
        name: req.body.name,
        description: req.body.description,
        type: req.body.type as OfferType,
        discountValue: Number(req.body.discountValue),
        minPurchaseAmount: req.body.minPurchaseAmount != null ? Number(req.body.minPurchaseAmount) : 0,
        maxDiscountLimit: req.body.maxDiscountLimit ? Number(req.body.maxDiscountLimit) : undefined,
        usageLimit: req.body.usageLimit ? Number(req.body.usageLimit) : null,
        perCustomerLimit: req.body.perCustomerLimit != null ? Number(req.body.perCustomerLimit) : 1,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        isActive: req.body.isActive === 'true' || req.body.isActive === true || req.body.isActive === undefined,
        bannerUrl: req.body.bannerUrl,
    };

    const coupon = await promotionService.createCoupon(scopeOf(req), data, req.file, req);
    return ok(res, coupon, 'Coupon created successfully', httpStatus.CREATED);
});

export const updateCoupon = catchAsync(async (req, res) => {
    const {id} = req.params;

    const data = {
        code: req.body.code,
        name: req.body.name,
        description: req.body.description,
        type: req.body.type as OfferType | undefined,
        discountValue: req.body.discountValue != null ? Number(req.body.discountValue) : undefined,
        minPurchaseAmount: req.body.minPurchaseAmount != null ? Number(req.body.minPurchaseAmount) : undefined,
        maxDiscountLimit: req.body.maxDiscountLimit !== undefined ? (req.body.maxDiscountLimit ? Number(req.body.maxDiscountLimit) : null) : undefined,
        usageLimit: req.body.usageLimit !== undefined ? (req.body.usageLimit ? Number(req.body.usageLimit) : null) : undefined,
        perCustomerLimit: req.body.perCustomerLimit != null ? Number(req.body.perCustomerLimit) : undefined,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : undefined,
        removeBanner: req.body.removeBanner === 'true' || req.body.removeBanner === true,
        bannerUrl: req.body.bannerUrl,
    };

    const updated = await promotionService.updateCoupon(scopeOf(req), id, data, req.file, req);
    return ok(res, updated, 'Coupon updated successfully');
});

export const toggleCouponStatus = catchAsync(async (req, res) => {
    const {id} = req.params;
    const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined;
    const updated = await promotionService.toggleCoupon(scopeOf(req), id, isActive);
    return ok(res, updated, 'Coupon status updated successfully');
});

export const deleteCoupon = catchAsync(async (req, res) => {
    const {id} = req.params;
    const result = await promotionService.deleteCoupon(scopeOf(req), id);
    return ok(res, result, 'Coupon deleted successfully');
});

// =========================================================
// 4. VALIDATION & CHECKOUT
// =========================================================
export const validateCoupon = catchAsync(async (req, res) => {
    const {code, subtotal, items} = req.body;
    const userId = req.user?.id;

    const result = await promotionService.validateCoupon(scopeOf(req), {
        code,
        subtotal: Number(subtotal),
        userId,
        items,
    });
    return ok(res, result, 'Coupon validated successfully');
});

