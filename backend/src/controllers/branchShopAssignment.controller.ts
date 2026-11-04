import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchShopAssignmentService from '../services/branchShopAssignment.service';

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

const get = catchAsync(async (req, res) => {
    const data = await branchShopAssignmentService.getAssignmentData(branchOf(req));
    return ok(res, data, 'Assignment data fetched successfully');
});

const move = catchAsync(async (req, res) => {
    const actorName = req.user.fullname || 'Snehal Kulkarni';
    const data = await branchShopAssignmentService.moveEmployee(branchOf(req), actorName, req.body);
    return ok(res, data, data.message, httpStatus.CREATED);
});

export default {
    get,
    move,
};

