import {Request} from 'express';
import httpStatus from 'http-status';
import {
    auditService,
    counterService,
    dashboardService,
    expenseService,
    salesReturnService,
} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {shopOpsValidation as v} from '@validations/index';
import {ShopScope} from '../services/shopProduct.service';

/*
 * Shop dashboard and counter operations: credit notes, the cash counter and
 * expenses. The shop scope is never taken from the request.
 */
const shopOf = (req: Request): ShopScope => {
    const {companyId, shopId} = req.user;
    if (!companyId || !shopId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    }
    return {companyId, shopId};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

const dashboard = catchAsync(async (req, res) =>
    ok(res, await dashboardService.getShopDashboard(shopOf(req)), 'Dashboard fetched successfully'),
);

const returns = {
    list: catchAsync(async (req, res) => {
        const query = v.returnListSchema.parse(req.query);
        return ok(
            res,
            await salesReturnService.list(shopOf(req), query),
            'Credit notes fetched successfully',
        );
    }),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(
            res,
            await salesReturnService.get(shopOf(req), id),
            'Credit note fetched successfully',
        );
    }),

    create: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const data = v.createSalesReturnSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'salesReturn.create', module: 'billing', targetId: data.salesBillId},
            async () => ({after: await salesReturnService.create(scope, req.user.id, data)}),
        );
        return ok(res, after, 'Return saved and stock restored', httpStatus.CREATED);
    }),
};

const counter = {
    current: catchAsync(async (req, res) =>
        ok(res, await counterService.current(shopOf(req)), 'Counter fetched successfully'),
    ),

    open: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {openingCash} = v.openCounterSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'counter.open', module: 'billing'},
            async () => ({after: await counterService.open(scope, req.user.id, openingCash)}),
        );
        return ok(res, after, 'Counter opened', httpStatus.CREATED);
    }),

    close: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {closingCash} = v.closeCounterSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'counter.close', module: 'billing'},
            async () => ({after: await counterService.close(scope, req.user.id, closingCash)}),
        );
        return ok(res, after, 'Counter closed');
    }),
};

const expenses = {
    list: catchAsync(async (req, res) => {
        const query = v.expenseListSchema.parse(req.query);
        return ok(
            res,
            await expenseService.list(shopOf(req), query),
            'Expenses fetched successfully',
        );
    }),

    nextNumber: catchAsync(async (req, res) => {
        const nextExpenseNumber = await expenseService.getNextExpenseNumber(shopOf(req));
        return ok(res, {nextExpenseNumber}, 'Next expense number fetched');
    }),

    create: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const data = v.createExpenseSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'expense.create', module: 'billing'},
            async () => ({after: await expenseService.create(scope, req.user.id, data)}),
        );
        return ok(res, after, 'Expense added', httpStatus.CREATED);
    }),
};

export default {dashboard, returns, counter, expenses};
