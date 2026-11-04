import {Request} from 'express';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import httpStatus from 'http-status';
import branchExpenseService from '../services/branchExpense.service';

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
    const data = await branchExpenseService.getExpenses(branchOf(req));
    return ok(res, data, 'Expenses fetched successfully');
});

const add = catchAsync(async (req, res) => {
    const data = await branchExpenseService.addExpense(branchOf(req), req.body);
    return ok(res, data, data.message, httpStatus.CREATED);
});

export default {
    list,
    add,
};

