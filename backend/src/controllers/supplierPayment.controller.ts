import {Request} from 'express';
import httpStatus from 'http-status';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import supplierPaymentService from '../services/supplierPayment.service';

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
    };
    const data = await supplierPaymentService.list(branchOf(req), query);
    return ok(res, data, 'Suppliers fetched successfully');
});

const summary = catchAsync(async (req, res) => {
    const data = await supplierPaymentService.summary(branchOf(req));
    return ok(res, data, 'Suppliers summary fetched successfully');
});

const recordPayment = catchAsync(async (req, res) => {
    const data = await supplierPaymentService.recordPayment(branchOf(req), req.user.id, req.body);
    return ok(res, data, data.message, httpStatus.CREATED);
});

export default {
    list,
    summary,
    recordPayment,
};

