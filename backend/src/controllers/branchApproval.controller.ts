import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchApprovalService from '../services/branchApproval.service';

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
    const data = await branchApprovalService.getApprovals(branchOf(req), tab);
    return ok(res, data, 'Approvals fetched successfully');
});

const decide = catchAsync(async (req, res) => {
    const {decision, note} = req.body;
    const data = await branchApprovalService.decide(branchOf(req), req.params.id, decision, note);
    return ok(res, data, data.message);
});

export default {
    list,
    decide,
};

