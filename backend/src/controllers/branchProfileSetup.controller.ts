import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchProfileSetupService, {updateProfileSchema} from '../services/branchProfileSetup.service';

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
    const data = await branchProfileSetupService.getProfile(branchOf(req));
    return ok(res, data, 'Branch profile fetched successfully');
});

const update = catchAsync(async (req, res) => {
    const data = await branchProfileSetupService.updateProfile(branchOf(req), updateProfileSchema.parse(req.body));
    return ok(res, data, data.message);
});

export default {
    get,
    update,
};

