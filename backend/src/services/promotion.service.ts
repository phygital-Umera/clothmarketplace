import {Prisma, OfferType, OfferApplicableOn} from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {Scope} from './account.service';
import {storeUpload} from '../utils/fileStore';
import {Request} from 'express';

export interface CreateOfferInput {
    name: string;
    description?: string;
    bannerUrl?: string | null;
    type: OfferType;
    discountValue: number;
    applicableOn: OfferApplicableOn;
    minOrderValue?: number;
    maxDiscountLimit?: number | null;
    startDate: Date | string;
    endDate: Date | string;
    isActive?: boolean;
    categoryIds?: string[];
    subcategoryIds?: string[];
    productIds?: string[];
}

export interface UpdateOfferInput extends Partial<CreateOfferInput> {
    removeBanner?: boolean;
}

export interface CreateCouponInput {
    code: string;
    name?: string;
    description?: string;
    bannerUrl?: string | null;
    type: OfferType;
    discountValue: number;
    minPurchaseAmount?: number;
    maxDiscountLimit?: number | null;
    usageLimit?: number | null;
    perCustomerLimit?: number;
    startDate: Date | string;
    endDate: Date | string;
    isActive?: boolean;
}

export interface UpdateCouponInput extends Partial<CreateCouponInput> {
    removeBanner?: boolean;
}

export interface ValidateCouponInput {
    code: string;
    subtotal: number;
    userId?: string;
    items?: {
        productId: string;
        variantId?: string;
        quantity: number;
        unitPrice: number;
    }[];
}

class PromotionService {
    /**
     * Compute virtual status for Offer / Coupon based on dates and active flag.
     */
    public computeStatus(item: {isActive: boolean; startDate: Date; endDate: Date; usedCount?: number; usageLimit?: number | null}) {
        const now = new Date();
        if (!item.isActive) return 'INACTIVE';
        if (item.usageLimit != null && item.usedCount != null && item.usedCount >= item.usageLimit) return 'EXHAUSTED';
        if (now < new Date(item.startDate)) return 'SCHEDULED';
        if (now > new Date(item.endDate)) return 'EXPIRED';
        return 'ACTIVE';
    }

    /**
     * Build base scope filter for offers and coupons.
     */
    private buildScopeWhere(scope: Scope) {
        return {
            ...(scope.companyId ? {companyId: scope.companyId} : {}),
            ...(scope.branchId ? {branchId: scope.branchId} : {}),
            ...(scope.shopId ? {shopId: scope.shopId} : {}),
        };
    }

    // =========================================================
    // 1. DASHBOARD & SUMMARY
    // =========================================================
    public getDashboard = async (scope: Scope) => {
        const scopeWhere = this.buildScopeWhere(scope);
        const now = new Date();

        const [offers, coupons, totalUsages, discountAgg, recentOffers, recentCoupons, recentUsages] = await Promise.all([
            prisma.offer.findMany({
                where: scopeWhere,
                select: {id: true, isActive: true, startDate: true, endDate: true},
            }),
            prisma.coupon.findMany({
                where: scopeWhere,
                select: {id: true, isActive: true, startDate: true, endDate: true, usedCount: true, usageLimit: true},
            }),
            prisma.couponUsage.count({
                where: scope.companyId
                    ? {coupon: {companyId: scope.companyId}}
                    : {},
            }),
            prisma.couponUsage.aggregate({
                where: scope.companyId
                    ? {coupon: {companyId: scope.companyId}}
                    : {},
                _sum: {discountAmount: true},
            }),
            prisma.offer.findMany({
                where: scopeWhere,
                orderBy: {createdAt: 'desc'},
                take: 5,
                include: {
                    categories: {select: {id: true, name: true}},
                    subcategories: {select: {id: true, name: true}},
                    products: {select: {id: true, name: true, sku: true}},
                },
            }),
            prisma.coupon.findMany({
                where: scopeWhere,
                orderBy: {createdAt: 'desc'},
                take: 5,
            }),
            prisma.couponUsage.findMany({
                where: scope.companyId
                    ? {coupon: {companyId: scope.companyId}}
                    : {},
                orderBy: {usedAt: 'desc'},
                take: 5,
                include: {
                    coupon: {select: {code: true, type: true, discountValue: true}},
                    user: {select: {id: true, fullname: true, email: true, phoneNumber: true}},
                },
            }),
        ]);

        let activeOffers = 0;
        let scheduledOffers = 0;
        let expiredOffers = 0;
        let inactiveOffers = 0;

        for (const o of offers) {
            const st = this.computeStatus(o);
            if (st === 'ACTIVE') activeOffers++;
            else if (st === 'SCHEDULED') scheduledOffers++;
            else if (st === 'EXPIRED') expiredOffers++;
            else inactiveOffers++;
        }

        let activeCoupons = 0;
        let scheduledCoupons = 0;
        let expiredCoupons = 0;

        for (const c of coupons) {
            const st = this.computeStatus(c);
            if (st === 'ACTIVE') activeCoupons++;
            else if (st === 'SCHEDULED') scheduledCoupons++;
            else expiredCoupons++;
        }

        return {
            summary: {
                totalOffers: offers.length,
                activeOffers,
                scheduledOffers,
                expiredOffers,
                inactiveOffers,
                totalCoupons: coupons.length,
                activeCoupons,
                scheduledCoupons,
                expiredCoupons,
                totalRedemptions: totalUsages,
                totalDiscountGiven: discountAgg._sum.discountAmount || 0,
            },
            recentOffers: recentOffers.map((o) => ({
                ...o,
                status: this.computeStatus(o),
            })),
            recentCoupons: recentCoupons.map((c) => ({
                ...c,
                status: this.computeStatus(c),
            })),
            recentUsages,
        };
    };

    // =========================================================
    // 2. OFFERS MANAGEMENT (CRUD)
    // =========================================================
    public listOffers = async (
        scope: Scope,
        params: {
            page?: number;
            limit?: number;
            search?: string;
            status?: string;
            type?: OfferType;
            applicableOn?: OfferApplicableOn;
        },
    ) => {
        const {page = 1, limit = 15, search, status, type, applicableOn} = params;
        const skip = (page - 1) * limit;
        const now = new Date();

        const scopeWhere = this.buildScopeWhere(scope);

        // Date / Active status filtering
        let statusWhere: Prisma.OfferWhereInput = {};
        if (status === 'active') {
            statusWhere = {
                isActive: true,
                startDate: {lte: now},
                endDate: {gte: now},
            };
        } else if (status === 'scheduled') {
            statusWhere = {
                isActive: true,
                startDate: {gt: now},
            };
        } else if (status === 'expired') {
            statusWhere = {
                endDate: {lt: now},
            };
        } else if (status === 'inactive') {
            statusWhere = {
                isActive: false,
            };
        }

        const where: Prisma.OfferWhereInput = {
            ...scopeWhere,
            ...statusWhere,
            ...(type ? {type} : {}),
            ...(applicableOn ? {applicableOn} : {}),
            ...(search
                ? {
                      OR: [
                          {name: {contains: search, mode: 'insensitive'}},
                          {description: {contains: search, mode: 'insensitive'}},
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.offer.findMany({
                where,
                skip,
                take: limit,
                include: {
                    categories: {select: {id: true, name: true, code: true}},
                    subcategories: {select: {id: true, name: true, code: true}},
                    products: {select: {id: true, name: true, sku: true}},
                },
                orderBy: {createdAt: 'desc'},
            }),
            prisma.offer.count({where}),
        ]);

        return {
            items: items.map((o) => ({
                ...o,
                status: this.computeStatus(o),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    public getOffer = async (scope: Scope, id: string) => {
        const scopeWhere = this.buildScopeWhere(scope);
        const offer = await prisma.offer.findFirst({
            where: {id, ...scopeWhere},
            include: {
                categories: {select: {id: true, name: true, code: true}},
                subcategories: {select: {id: true, name: true, code: true}},
                products: {select: {id: true, name: true, sku: true, mrp: true}},
            },
        });
        if (!offer) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
        }
        return {
            ...offer,
            status: this.computeStatus(offer),
        };
    };

    public createOffer = async (
        scope: Scope,
        data: CreateOfferInput,
        file?: Express.Multer.File,
        req?: Request,
    ) => {
        const {
            name,
            description,
            type,
            discountValue,
            applicableOn,
            minOrderValue = 0,
            maxDiscountLimit,
            startDate,
            endDate,
            isActive = true,
            categoryIds = [],
            subcategoryIds = [],
            productIds = [],
        } = data;

        if (new Date(startDate) > new Date(endDate)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Offer start date must be before or equal to end date');
        }

        let bannerUrl = data.bannerUrl;
        if (file && req) {
            bannerUrl = await storeUpload(req, file, 'offers');
        }

        const offer = await prisma.offer.create({
            data: {
                name,
                description,
                bannerUrl,
                type,
                discountValue: Number(discountValue),
                applicableOn,
                minOrderValue: Number(minOrderValue) || 0,
                maxDiscountLimit: maxDiscountLimit != null ? Number(maxDiscountLimit) : null,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: Boolean(isActive),
                companyId: scope.companyId,
                branchId: scope.branchId,
                shopId: scope.shopId,
                categories:
                    applicableOn === 'SELECTED_CATEGORIES' && categoryIds.length
                        ? {connect: categoryIds.map((id) => ({id}))}
                        : undefined,
                subcategories:
                    applicableOn === 'SELECTED_SUBCATEGORIES' && subcategoryIds.length
                        ? {connect: subcategoryIds.map((id) => ({id}))}
                        : undefined,
                products:
                    applicableOn === 'SELECTED_PRODUCTS' && productIds.length
                        ? {connect: productIds.map((id) => ({id}))}
                        : undefined,
            },
            include: {
                categories: {select: {id: true, name: true}},
                subcategories: {select: {id: true, name: true}},
                products: {select: {id: true, name: true, sku: true}},
            },
        });

        return {
            ...offer,
            status: this.computeStatus(offer),
        };
    };

    public updateOffer = async (
        scope: Scope,
        id: string,
        data: UpdateOfferInput,
        file?: Express.Multer.File,
        req?: Request,
    ) => {
        await this.getOffer(scope, id);

        let bannerUrl = data.bannerUrl;
        if (file && req) {
            bannerUrl = await storeUpload(req, file, 'offers');
        } else if (data.removeBanner) {
            bannerUrl = null;
        }

        const {
            name,
            description,
            type,
            discountValue,
            applicableOn,
            minOrderValue,
            maxDiscountLimit,
            startDate,
            endDate,
            isActive,
            categoryIds,
            subcategoryIds,
            productIds,
        } = data;

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Offer start date must be before end date');
        }

        const updated = await prisma.offer.update({
            where: {id},
            data: {
                ...(name !== undefined ? {name} : {}),
                ...(description !== undefined ? {description} : {}),
                ...(bannerUrl !== undefined ? {bannerUrl} : {}),
                ...(type !== undefined ? {type} : {}),
                ...(discountValue !== undefined ? {discountValue: Number(discountValue)} : {}),
                ...(applicableOn !== undefined ? {applicableOn} : {}),
                ...(minOrderValue !== undefined ? {minOrderValue: Number(minOrderValue)} : {}),
                ...(maxDiscountLimit !== undefined
                    ? {maxDiscountLimit: maxDiscountLimit != null ? Number(maxDiscountLimit) : null}
                    : {}),
                ...(startDate !== undefined ? {startDate: new Date(startDate)} : {}),
                ...(endDate !== undefined ? {endDate: new Date(endDate)} : {}),
                ...(isActive !== undefined ? {isActive: Boolean(isActive)} : {}),
                categories:
                    categoryIds !== undefined
                        ? {set: categoryIds.map((cid) => ({id: cid}))}
                        : undefined,
                subcategories:
                    subcategoryIds !== undefined
                        ? {set: subcategoryIds.map((sid) => ({id: sid}))}
                        : undefined,
                products:
                    productIds !== undefined
                        ? {set: productIds.map((pid) => ({id: pid}))}
                        : undefined,
            },
            include: {
                categories: {select: {id: true, name: true, code: true}},
                subcategories: {select: {id: true, name: true, code: true}},
                products: {select: {id: true, name: true, sku: true}},
            },
        });

        return {
            ...updated,
            status: this.computeStatus(updated),
        };
    };

    public toggleOffer = async (scope: Scope, id: string, isActive?: boolean) => {
        const existing = await this.getOffer(scope, id);
        const nextState = isActive !== undefined ? isActive : !existing.isActive;

        const updated = await prisma.offer.update({
            where: {id},
            data: {isActive: nextState},
        });

        return {
            ...updated,
            status: this.computeStatus(updated),
        };
    };

    public deleteOffer = async (scope: Scope, id: string) => {
        await this.getOffer(scope, id);
        await prisma.offer.delete({where: {id}});
        return {id, deleted: true};
    };

    // =========================================================
    // 3. COUPONS MANAGEMENT (CRUD)
    // =========================================================
    public listCoupons = async (
        scope: Scope,
        params: {
            page?: number;
            limit?: number;
            search?: string;
            status?: string;
            type?: OfferType;
        },
    ) => {
        const {page = 1, limit = 15, search, status, type} = params;
        const skip = (page - 1) * limit;
        const now = new Date();

        const scopeWhere = this.buildScopeWhere(scope);

        let statusWhere: Prisma.CouponWhereInput = {};
        if (status === 'active') {
            statusWhere = {
                isActive: true,
                startDate: {lte: now},
                endDate: {gte: now},
            };
        } else if (status === 'scheduled') {
            statusWhere = {
                isActive: true,
                startDate: {gt: now},
            };
        } else if (status === 'expired') {
            statusWhere = {
                endDate: {lt: now},
            };
        } else if (status === 'inactive') {
            statusWhere = {
                isActive: false,
            };
        }

        const where: Prisma.CouponWhereInput = {
            ...scopeWhere,
            ...statusWhere,
            ...(type ? {type} : {}),
            ...(search
                ? {
                      OR: [
                          {code: {contains: search.toUpperCase(), mode: 'insensitive'}},
                          {name: {contains: search, mode: 'insensitive'}},
                          {description: {contains: search, mode: 'insensitive'}},
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.coupon.findMany({
                where,
                skip,
                take: limit,
                orderBy: {createdAt: 'desc'},
            }),
            prisma.coupon.count({where}),
        ]);

        return {
            items: items.map((c) => ({
                ...c,
                status: this.computeStatus(c),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    public getCoupon = async (scope: Scope, id: string) => {
        const scopeWhere = this.buildScopeWhere(scope);
        const coupon = await prisma.coupon.findFirst({
            where: {id, ...scopeWhere},
            include: {
                usages: {
                    take: 10,
                    orderBy: {usedAt: 'desc'},
                    include: {
                        user: {select: {id: true, fullname: true, email: true, phoneNumber: true}},
                    },
                },
            },
        });
        if (!coupon) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found');
        }
        return {
            ...coupon,
            status: this.computeStatus(coupon),
        };
    };

    public createCoupon = async (
        scope: Scope,
        data: CreateCouponInput,
        file?: Express.Multer.File,
        req?: Request,
    ) => {
        const {
            code,
            name,
            description,
            type,
            discountValue,
            minPurchaseAmount = 0,
            maxDiscountLimit,
            usageLimit,
            perCustomerLimit = 1,
            startDate,
            endDate,
            isActive = true,
        } = data;

        const normalizedCode = code.trim().toUpperCase();

        const existing = await prisma.coupon.findUnique({
            where: {code: normalizedCode},
        });
        if (existing) {
            throw new ApiError(httpStatus.CONFLICT, `Coupon code '${normalizedCode}' already exists`);
        }

        if (new Date(startDate) > new Date(endDate)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon start date must be before end date');
        }

        let bannerUrl = data.bannerUrl;
        if (file && req) {
            bannerUrl = await storeUpload(req, file, 'coupons');
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: normalizedCode,
                name: name || normalizedCode,
                description,
                bannerUrl,
                type,
                discountValue: Number(discountValue),
                minPurchaseAmount: Number(minPurchaseAmount) || 0,
                maxDiscountLimit: maxDiscountLimit != null ? Number(maxDiscountLimit) : null,
                usageLimit: usageLimit != null ? Number(usageLimit) : null,
                perCustomerLimit: Number(perCustomerLimit) || 1,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: Boolean(isActive),
                companyId: scope.companyId,
                branchId: scope.branchId,
                shopId: scope.shopId,
            },
        });

        return {
            ...coupon,
            status: this.computeStatus(coupon),
        };
    };

    public updateCoupon = async (
        scope: Scope,
        id: string,
        data: UpdateCouponInput,
        file?: Express.Multer.File,
        req?: Request,
    ) => {
        const existing = await this.getCoupon(scope, id);

        let bannerUrl = data.bannerUrl;
        if (file && req) {
            bannerUrl = await storeUpload(req, file, 'coupons');
        } else if (data.removeBanner) {
            bannerUrl = null;
        }

        let normalizedCode: string | undefined = undefined;
        if (data.code && data.code.trim().toUpperCase() !== existing.code) {
            normalizedCode = data.code.trim().toUpperCase();
            const duplicate = await prisma.coupon.findUnique({where: {code: normalizedCode}});
            if (duplicate) {
                throw new ApiError(httpStatus.CONFLICT, `Coupon code '${normalizedCode}' already exists`);
            }
        }

        const {
            name,
            description,
            type,
            discountValue,
            minPurchaseAmount,
            maxDiscountLimit,
            usageLimit,
            perCustomerLimit,
            startDate,
            endDate,
            isActive,
        } = data;

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon start date must be before end date');
        }

        const updated = await prisma.coupon.update({
            where: {id},
            data: {
                ...(normalizedCode ? {code: normalizedCode} : {}),
                ...(name !== undefined ? {name} : {}),
                ...(description !== undefined ? {description} : {}),
                ...(bannerUrl !== undefined ? {bannerUrl} : {}),
                ...(type !== undefined ? {type} : {}),
                ...(discountValue !== undefined ? {discountValue: Number(discountValue)} : {}),
                ...(minPurchaseAmount !== undefined ? {minPurchaseAmount: Number(minPurchaseAmount)} : {}),
                ...(maxDiscountLimit !== undefined
                    ? {maxDiscountLimit: maxDiscountLimit != null ? Number(maxDiscountLimit) : null}
                    : {}),
                ...(usageLimit !== undefined ? {usageLimit: usageLimit != null ? Number(usageLimit) : null} : {}),
                ...(perCustomerLimit !== undefined ? {perCustomerLimit: Number(perCustomerLimit)} : {}),
                ...(startDate !== undefined ? {startDate: new Date(startDate)} : {}),
                ...(endDate !== undefined ? {endDate: new Date(endDate)} : {}),
                ...(isActive !== undefined ? {isActive: Boolean(isActive)} : {}),
            },
        });

        return {
            ...updated,
            status: this.computeStatus(updated),
        };
    };

    public toggleCoupon = async (scope: Scope, id: string, isActive?: boolean) => {
        const existing = await this.getCoupon(scope, id);
        const nextState = isActive !== undefined ? isActive : !existing.isActive;

        const updated = await prisma.coupon.update({
            where: {id},
            data: {isActive: nextState},
        });

        return {
            ...updated,
            status: this.computeStatus(updated),
        };
    };

    public deleteCoupon = async (scope: Scope, id: string) => {
        await this.getCoupon(scope, id);
        await prisma.coupon.delete({where: {id}});
        return {id, deleted: true};
    };

    // =========================================================
    // 4. COUPON VALIDATION & DISCOUNT CALCULATION (SECURE)
    // =========================================================
    public validateCoupon = async (scope: Scope, input: ValidateCouponInput) => {
        const {code, subtotal, userId} = input;
        const normalizedCode = code?.trim().toUpperCase();

        if (!normalizedCode) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code is required');
        }

        if (subtotal == null || subtotal < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Valid order subtotal is required');
        }

        const coupon = await prisma.coupon.findUnique({
            where: {code: normalizedCode},
        });

        if (!coupon) {
            throw new ApiError(httpStatus.NOT_FOUND, `Coupon '${normalizedCode}' not found`);
        }

        // Scope check
        if (scope.companyId && coupon.companyId && coupon.companyId !== scope.companyId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Coupon is not applicable to this store');
        }

        // Active check
        if (!coupon.isActive) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon is currently inactive');
        }

        // Date validity check
        const now = new Date();
        if (now < new Date(coupon.startDate)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `This coupon is valid starting from ${coupon.startDate.toLocaleDateString()}`,
            );
        }
        if (now > new Date(coupon.endDate)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon has expired');
        }

        // Total usage limit check
        if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This coupon has reached its maximum global usage limit');
        }

        // Per-customer limit check
        if (userId) {
            const customerUses = await prisma.couponUsage.count({
                where: {couponId: coupon.id, userId},
            });
            if (customerUses >= coupon.perCustomerLimit) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `You have already reached the maximum use limit (${coupon.perCustomerLimit}) for this coupon`,
                );
            }
        }

        // Minimum purchase amount check
        if (subtotal < coupon.minPurchaseAmount) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required to use this coupon`,
            );
        }

        // Calculate discount securely
        let calculatedDiscount = 0;
        if (coupon.type === 'PERCENTAGE') {
            calculatedDiscount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscountLimit != null && coupon.maxDiscountLimit > 0) {
                calculatedDiscount = Math.min(calculatedDiscount, coupon.maxDiscountLimit);
            }
        } else {
            // FLAT discount
            calculatedDiscount = Math.min(coupon.discountValue, subtotal);
        }

        calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;
        const finalAmount = Math.max(0, Math.round((subtotal - calculatedDiscount) * 100) / 100);

        return {
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                name: coupon.name,
                type: coupon.type,
                discountValue: coupon.discountValue,
                maxDiscountLimit: coupon.maxDiscountLimit,
                minPurchaseAmount: coupon.minPurchaseAmount,
            },
            subtotal,
            discountAmount: calculatedDiscount,
            finalAmount,
            message: `Coupon '${coupon.code}' applied successfully: saved ₹${calculatedDiscount}!`,
        };
    };

    /**
     * Record coupon usage upon order placement (transaction-safe)
     */
    public recordUsage = async (data: {
        couponId: string;
        userId: string;
        orderId?: string;
        discountAmount: number;
    }) => {
        return prisma.$transaction(async (tx) => {
            const usage = await tx.couponUsage.create({
                data: {
                    couponId: data.couponId,
                    userId: data.userId,
                    orderId: data.orderId,
                    discountAmount: Number(data.discountAmount) || 0,
                },
            });

            await tx.coupon.update({
                where: {id: data.couponId},
                data: {usedCount: {increment: 1}},
            });

            return usage;
        });
    };
}

export default new PromotionService();
