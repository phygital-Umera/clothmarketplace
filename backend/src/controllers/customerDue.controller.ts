import {Request} from 'express';
import httpStatus from 'http-status';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {z} from 'zod';
import customerDueService, {
    customerDueQuerySchema,
    updateLimitSchema,
} from '../services/customerDue.service';

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

const idOf = (req: Request) => z.string().uuid('Invalid customer').parse(req.params.id);

const list = catchAsync(async (req, res) => {
    const data = await customerDueService.list(branchOf(req), customerDueQuerySchema.parse(req.query));
    return ok(res, data, 'Customer dues fetched successfully');
});

const summary = catchAsync(async (req, res) => {
    const data = await customerDueService.summary(branchOf(req));
    return ok(res, data, 'Customer dues summary fetched successfully');
});

const get = catchAsync(async (req, res) => {
    const data = await customerDueService.get(branchOf(req), idOf(req));
    return ok(res, data, 'Customer credit details fetched successfully');
});

const updateLimit = catchAsync(async (req, res) => {
    const data = await customerDueService.updateLimit(branchOf(req), idOf(req), updateLimitSchema.parse(req.body));
    return ok(res, data, 'Credit limit saved');
});

const sendReminders = catchAsync(async (req, res) => {
    const ids = z.array(z.string().uuid()).max(500).optional().parse(req.body?.customerIds);
    const data = await customerDueService.reminders(branchOf(req), ids);
    return ok(res, data, `${data.reminders.length} reminder${data.reminders.length === 1 ? '' : 's'} ready`);
});

const exportDues = catchAsync(async (req, res) => {
    const data = await customerDueService.export(branchOf(req), customerDueQuerySchema.parse(req.query));
    return ok(res, data, 'Customer dues exported successfully');
});

export default {
    list,
    summary,
    get,
    updateLimit,
    sendReminders,
    export: exportDues,
};
