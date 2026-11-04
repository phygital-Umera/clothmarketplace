import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchPricingService from '../services/branchPricing.service';

const branchOf = (req: Request) => {
    const {companyId, branchId} = req.user;
    if (!companyId || !branchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch is linked to this account');
    }
    return {companyId, branchId};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

const list = catchAsync(async (req, res) => {
    const query = {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        tab: typeof req.query.tab === 'string' ? (req.query.tab as any) : undefined,
    };
    const data = await branchPricingService.list(branchOf(req), query);
    return ok(res, data, 'Branch prices fetched successfully');
});

const savePrices = catchAsync(async (req, res) => {
    const data = await branchPricingService.savePrices(branchOf(req), req.body);
    return ok(res, data, data.message);
});

const scheduleBulkPrice = catchAsync(async (req, res) => {
    const data = await branchPricingService.scheduleBulkPrice(branchOf(req), req.body);
    return ok(res, data, data.message);
});

export default {
    list,
    savePrices,
    scheduleBulkPrice,
};

