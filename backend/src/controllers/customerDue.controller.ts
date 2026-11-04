import {Request} from 'express';
import httpStatus from 'http-status';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import customerDueService from '../services/customerDue.service';

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
        shopId: typeof req.query.shopId === 'string' ? req.query.shopId : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    const data = await customerDueService.list(branchOf(req), query);
    return ok(res, data, 'Customer dues fetched successfully');
});

const summary = catchAsync(async (req, res) => {
    const data = await customerDueService.summary(branchOf(req));
    return ok(res, data, 'Customer dues summary fetched successfully');
});

const get = catchAsync(async (req, res) => {
    const {id} = req.params;
    const data = await customerDueService.get(branchOf(req), id);
    return ok(res, data, 'Customer credit details fetched successfully');
});

const updateLimit = catchAsync(async (req, res) => {
    const {id} = req.params;
    const data = await customerDueService.updateLimit(branchOf(req), id, req.body);
    return ok(res, data, 'Customer credit limit updated successfully');
});

const sendReminders = catchAsync(async (req, res) => {
    const data = await customerDueService.sendReminders(branchOf(req), req.body?.customerIds);
    return ok(res, data, data.message);
});

const exportDues = catchAsync(async (req, res) => {
    const query = {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        tab: typeof req.query.tab === 'string' ? (req.query.tab as any) : undefined,
    };
    const data = await customerDueService.export(branchOf(req), query);
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

