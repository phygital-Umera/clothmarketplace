import {Request} from 'express';
import httpStatus from 'http-status';
import {OrderStatus, PaymentStatus, Role} from '@prisma/client';
import {inventoryService, orderService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {Scope} from '../services/account.service';

const scopeOf = (req: Request): Scope => {
    const {role, companyId, branchId} = req.user;
    if (role === Role.SUPER_ADMIN) return {};
    if (!companyId)
        throw new ApiError(httpStatus.FORBIDDEN, 'No company is linked to this account');
    if (role === Role.ADMIN) return {companyId};
    if (!branchId) throw new ApiError(httpStatus.FORBIDDEN, 'No branch is linked to this account');
    return {companyId, branchId};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

// Inventory
export const listInventory = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;

    const result = await inventoryService.list(scopeOf(req), {page, limit, search, branchId});
    return ok(res, result, 'Inventory fetched successfully');
});

export const adjustStock = catchAsync(async (req, res) => {
    const adjusted = await inventoryService.adjustStock(scopeOf(req), req.body, req.user.id);
    return ok(res, adjusted, 'Stock adjusted successfully');
});

export const listMovements = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;

    const result = await inventoryService.movements(scopeOf(req), {page, limit, branchId});
    return ok(res, result, 'Stock movements retrieved successfully');
});

// Orders
export const listOrders = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as OrderStatus | undefined;
    const paymentStatus = req.query.paymentStatus as PaymentStatus | undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await orderService.list(scopeOf(req), {
        page,
        limit,
        status,
        paymentStatus,
        search,
    });
    return ok(res, result, 'Orders fetched successfully');
});

export const getOrder = catchAsync(async (req, res) => {
    const {id} = req.params;
    const order = await orderService.get(scopeOf(req), id);
    return ok(res, order, 'Order fetched successfully');
});

export const updateOrderStatus = catchAsync(async (req, res) => {
    const {id} = req.params;
    const {status, trackingNumber} = req.body;
    const updated = await orderService.updateStatus(scopeOf(req), id, status, trackingNumber);
    return ok(res, updated, 'Order status updated successfully');
});

// Returns
export const listReturns = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await orderService.listReturns(scopeOf(req), {page, limit});
    return ok(res, result, 'Returns fetched successfully');
});

export const updateReturnStatus = catchAsync(async (req, res) => {
    const {id} = req.params;
    const updated = await orderService.updateReturnStatus(scopeOf(req), id, req.body);
    return ok(res, updated, 'Return status updated successfully');
});
