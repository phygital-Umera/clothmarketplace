import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchShopAssignmentService, {
    MOVE_ACTION,
    moveEmployeeSchema,
} from '../services/branchShopAssignment.service';
import {auditService} from '@services/index';

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
    const data = moveEmployeeSchema.parse(req.body);
    const result = await auditService.track(
        req,
        {action: MOVE_ACTION, module: 'staff', targetId: data.employeeId, reason: data.reason},
        () => branchShopAssignmentService.moveEmployee(branchOf(req), data),
    );
    return ok(res, {success: true, message: result.message}, result.message);
});

export default {
    get,
    move,
};

