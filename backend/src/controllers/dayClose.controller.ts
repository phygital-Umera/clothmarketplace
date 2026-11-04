import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import dayCloseService from '../services/dayClose.service';

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
    const dateStr = typeof req.query.date === 'string' ? req.query.date : '2026-11-02';
    const data = await dayCloseService.getDayClose(branchOf(req), dateStr);
    return ok(res, data, 'Day close data fetched successfully');
});

const resolveDifference = catchAsync(async (req, res) => {
    const data = await dayCloseService.resolveDifference(branchOf(req), req.user.id, req.body);
    return ok(res, data, data.message);
});

const recordDeposit = catchAsync(async (req, res) => {
    const data = await dayCloseService.recordDeposit(branchOf(req), req.user.id, req.body);
    return ok(res, data, data.message, httpStatus.CREATED);
});

export default {
    get,
    resolveDifference,
    recordDeposit,
};

