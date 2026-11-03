import {Request} from 'express';
import httpStatus from 'http-status';
import {OrderStatus, PaymentStatus, ReturnStatus, Role, StockSourceType} from '@prisma/client';
import {inventoryService, orderService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {Scope} from '../services/account.service';

const scopeOf = (req: Request): Scope => {
    const {role, companyId, branchId, shopId} = req.user;
    if (role === Role.SUPER_ADMIN) return {};
    if (!companyId)
        throw new ApiError(httpStatus.FORBIDDEN, 'No company is linked to this account');
    if (role === Role.ADMIN) return {companyId};
    return {companyId, branchId: branchId ?? undefined, shopId: shopId ?? undefined};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

// Inventory
export const inventoryDashboard = catchAsync(async (req, res) => {
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const result = await inventoryService.getDashboard(scopeOf(req), {branchId});
    return ok(res, result, 'Inventory dashboard fetched successfully');
});

export const listInventory = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const status = (req.query.status as any) || 'all';
    const categoryId = req.query.categoryId ? String(req.query.categoryId) : undefined;
    const view = (req.query.view as any) || 'product';

    const result = await inventoryService.list(scopeOf(req), {
        page,
        limit,
        search,
        status,
        categoryId,
        view,
        branchId,
    });
    return ok(res, result, 'Inventory fetched successfully');
});

export const adjustStock = catchAsync(async (req, res) => {
    const adjusted = await inventoryService.adjustStock(scopeOf(req), req.body, req.user.id);
    return ok(res, adjusted, 'Stock adjusted successfully');
});

export const batchAdjustStock = catchAsync(async (req, res) => {
    const result = await inventoryService.batchAdjust(scopeOf(req), req.body, req.user.id);
    return ok(res, result, 'Batch stock adjustment completed successfully');
});

export const updateThreshold = catchAsync(async (req, res) => {
    const updated = await inventoryService.updateThreshold(scopeOf(req), req.body);
    return ok(res, updated, 'Threshold updated successfully');
});

export const listMovements = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const variantId = req.query.variantId ? String(req.query.variantId) : undefined;
    const productId = req.query.productId ? String(req.query.productId) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const action = req.query.action ? String(req.query.action) : undefined;
    const type = req.query.type as any;
    const sourceType = req.query.sourceType
        ? (String(req.query.sourceType) as StockSourceType)
        : undefined;
    const sourceId = req.query.sourceId ? String(req.query.sourceId) : undefined;

    const result = await inventoryService.movements(scopeOf(req), {
        page,
        limit,
        branchId,
        productId,
        variantId,
        search,
        action,
        type,
        sourceType,
        sourceId,
    });
    return ok(res, result, 'Stock movements retrieved successfully');
});

// Orders & Order Dashboard
export const orderDashboard = catchAsync(async (req, res) => {
    const result = await orderService.getDashboard(scopeOf(req));
    return ok(res, result, 'Order dashboard retrieved successfully');
});

export const listOrders = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const status = req.query.status as OrderStatus | undefined;
    const paymentStatus = req.query.paymentStatus as PaymentStatus | undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const cancellationPending = req.query.cancellationPending === 'true';

    const result = await orderService.list(scopeOf(req), {
        page,
        limit,
        status,
        paymentStatus,
        search,
        startDate,
        endDate,
        cancellationPending,
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
    const {status, comment, courierName, trackingNumber} = req.body;
    const updated = await orderService.updateStatus(
        scopeOf(req),
        id,
        {status, comment, courierName, trackingNumber},
        req.user?.id,
    );
    return ok(res, updated, 'Order status updated successfully');
});

export const updateOrderShipping = catchAsync(async (req, res) => {
    const {id} = req.params;
    const {courierName, trackingNumber, status, comment} = req.body;
    const updated = await orderService.updateShipping(
        scopeOf(req),
        id,
        {courierName, trackingNumber, status, comment},
        req.user?.id,
    );
    return ok(res, updated, 'Shipping information updated successfully');
});

export const updateOrderPayment = catchAsync(async (req, res) => {
    const {id} = req.params;
    const {paymentStatus, paymentDetails, comment} = req.body;
    const updated = await orderService.updatePayment(
        scopeOf(req),
        id,
        {paymentStatus, paymentDetails, comment},
        req.user?.id,
    );
    return ok(res, updated, 'Payment details updated successfully');
});

export const reviewCancellation = catchAsync(async (req, res) => {
    const {id} = req.params;
    const {approve, reason} = req.body;
    const updated = await orderService.reviewCancellation(
        scopeOf(req),
        id,
        {approve: Boolean(approve), reason},
        req.user?.id,
    );
    return ok(res, updated, `Cancellation request ${approve ? 'approved' : 'rejected'} successfully`);
});

// Returns
export const listReturns = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const status = req.query.status as ReturnStatus | undefined;
    const result = await orderService.listReturns(scopeOf(req), {page, limit, status});
    return ok(res, result, 'Returns fetched successfully');
});

export const updateReturnStatus = catchAsync(async (req, res) => {
    const {id} = req.params;
    const updated = await orderService.updateReturnStatus(scopeOf(req), id, req.body, req.user?.id);
    return ok(res, updated, 'Return status updated successfully');
});

export const getOrderInvoice = catchAsync(async (req, res) => {
    const {id} = req.params;
    const invoice = await orderService.getInvoiceData(scopeOf(req), id);
    return ok(res, invoice, 'Invoice data retrieved successfully');
});

// Customer endpoints
export const customerCheckout = catchAsync(async (req, res) => {
    const order = await orderService.createCustomerOrder(req.user.id, req.body);
    return ok(res, order, 'Order placed successfully', httpStatus.CREATED);
});

export const listCustomerOrders = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const status = req.query.status as OrderStatus | undefined;
    const result = await orderService.listCustomerOrders(req.user.id, {page, limit, status});
    return ok(res, result, 'Customer orders retrieved successfully');
});

export const getCustomerOrder = catchAsync(async (req, res) => {
    const {id} = req.params;
    const order = await orderService.getCustomerOrder(req.user.id, id);
    return ok(res, order, 'Order details retrieved successfully');
});

export const customerCancelOrder = catchAsync(async (req, res) => {
    const {id} = req.params;
    const {reason} = req.body;
    const updated = await orderService.requestCustomerCancellation(req.user.id, id, reason || 'Cancelled by customer');
    return ok(res, updated, 'Cancellation request submitted successfully');
});

export const customerReturnOrder = catchAsync(async (req, res) => {
    const {id} = req.params;
    const result = await orderService.requestCustomerReturn(req.user.id, id, req.body);
    return ok(res, result, 'Return request submitted successfully', httpStatus.CREATED);
});
