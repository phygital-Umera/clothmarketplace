import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import stockTransferService from '../services/stockTransfer.service';

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
    };
    const data = await stockTransferService.list(branchOf(req), query);
    return ok(res, data, 'Stock transfers fetched successfully');
});

const summary = catchAsync(async (req, res) => {
    const data = await stockTransferService.summary(branchOf(req));
    return ok(res, data, 'Stock transfer summary fetched successfully');
});

const get = catchAsync(async (req, res) => {
    const {id} = req.params;
    const data = await stockTransferService.get(branchOf(req), id);
    return ok(res, data, 'Transfer details fetched successfully');
});

const confirmReceipt = catchAsync(async (req, res) => {
    const {id} = req.params;
    const data = await stockTransferService.confirmReceipt(branchOf(req), id, req.body);
    return ok(res, data, data.message);
});

const create = catchAsync(async (req, res) => {
    const data = await stockTransferService.create(branchOf(req), req.user.id, req.body);
    return ok(res, data, 'Stock transfer created successfully', httpStatus.CREATED);
});

export default {
    list,
    summary,
    get,
    confirmReceipt,
    create,
};

