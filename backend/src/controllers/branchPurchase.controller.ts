import {Request} from 'express';
import httpStatus from 'http-status';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {z} from 'zod';
import branchPurchaseService, {branchPurchaseQuerySchema} from '../services/branchPurchase.service';

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
    const data = await branchPurchaseService.list(branchOf(req), branchPurchaseQuerySchema.parse(req.query));
    return ok(res, data, 'Branch purchase bills fetched successfully');
});

const summary = catchAsync(async (req, res) => {
    const month = branchPurchaseQuerySchema.shape.month.parse(req.query.month || undefined);
    const data = await branchPurchaseService.summary(branchOf(req), month);
    return ok(res, data, 'Purchase summary fetched successfully');
});

const get = catchAsync(async (req, res) => {
    const id = z.string().uuid('Invalid purchase bill').parse(req.params.id);
    const data = await branchPurchaseService.get(branchOf(req), id);
    return ok(res, data, 'Purchase bill fetched successfully');
});

// Purchase bills are made by the shops (they bring stock into a shop)
export default {
    list,
    summary,
    get,
};
