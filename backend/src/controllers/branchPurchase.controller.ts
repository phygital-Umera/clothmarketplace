import {Request} from 'express';
import httpStatus from 'http-status';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import branchPurchaseService from '../services/branchPurchase.service';

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
        tab: typeof req.query.tab === 'string' ? (req.query.tab as any) : undefined,
        supplierName: typeof req.query.supplierName === 'string' ? req.query.supplierName : undefined,
        month: typeof req.query.month === 'string' ? req.query.month : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const data = await branchPurchaseService.list(branchOf(req), query);
    return ok(res, data, 'Branch purchase bills fetched successfully');
});

const summary = catchAsync(async (req, res) => {
    const data = await branchPurchaseService.summary(branchOf(req));
    return ok(res, data, 'Purchase summary fetched successfully');
});

const get = catchAsync(async (req, res) => {
    const {id} = req.params;
    const data = await branchPurchaseService.get(branchOf(req), id);
    return ok(res, data, 'Purchase bill fetched successfully');
});

const create = catchAsync(async (req, res) => {
    const data = await branchPurchaseService.create(branchOf(req), req.user.id, req.body);
    return ok(res, data, 'Branch purchase saved successfully', httpStatus.CREATED);
});

export default {
    list,
    summary,
    get,
    create,
};

