import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchReportsService from '../services/branchReports.service';

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

const getPnl = catchAsync(async (req, res) => {
    const fromDate = typeof req.query.from === 'string' ? req.query.from : '2026-11-01';
    const toDate = typeof req.query.to === 'string' ? req.query.to : '2026-11-03';
    const data = await branchReportsService.getPnl(branchOf(req), fromDate, toDate);
    return ok(res, data, 'Report fetched successfully');
});

export default {
    getPnl,
};

