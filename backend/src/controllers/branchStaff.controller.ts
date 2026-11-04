import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchStaffService from '../services/branchStaff.service';

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
    const tab = typeof req.query.tab === 'string' ? req.query.tab : undefined;
    const shop = typeof req.query.shop === 'string' ? req.query.shop : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const data = await branchStaffService.getStaff(branchOf(req), {tab, shop, search});
    return ok(res, data, 'Branch staff fetched successfully');
});

const invite = catchAsync(async (req, res) => {
    const data = await branchStaffService.inviteStaff(branchOf(req), req.body);
    return ok(res, data, data.message, httpStatus.CREATED);
});

export default {
    list,
    invite,
};

