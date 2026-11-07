import {
    Prisma,
    OrderStatus,
    PaymentStatus,
    ReturnStatus,
    RefundStatus,
    MovementType,
    StockSourceType,
} from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {Scope} from './account.service';
import inventoryService from './inventory.service';
import {notify, notifyOrderStatus} from './notification.service';

/** Items a customer is returning: [{orderItemId, quantity}] (older requests have none = whole order) */
export const returnedLines = <T extends {id: string; quantity: number}>(items: T[], returnItems: unknown) => {
    const picked = Array.isArray(returnItems)
        ? (returnItems as {orderItemId?: string; quantity?: number}[]).filter((r) => r?.orderItemId)
        : [];
    if (!picked.length) return items.map((item) => ({item, quantity: item.quantity}));
    return picked
        .map((r) => {
            const item = items.find((i) => i.id === r.orderItemId);
            return item ? {item, quantity: Math.min(item.quantity, Math.max(1, Number(r.quantity) || 1))} : null;
        })
        .filter((x): x is {item: T; quantity: number} => x !== null);
};

/**
 * Where an order may go next. Forward only (a failed delivery can go back to
 * Shipped); Delivered moves on only through a return, Cancelled never moves.
 */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'PACKED', 'CANCELLED'],
    PROCESSING: ['PACKED', 'CANCELLED'],
    PACKED: ['READY_FOR_DISPATCH', 'DISPATCHED', 'SHIPPED', 'CANCELLED'],
    READY_FOR_DISPATCH: ['DISPATCHED', 'SHIPPED', 'CANCELLED'],
    DISPATCHED: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'],
    SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'SHIPPED'],
    DELIVERED: [],
    CANCELLED: [],
    RETURNED: [],
};
const STATUS_NAME = (s: string) => s.toLowerCase().replace(/_/g, ' ');

/** Return requests move forward only; Completed and Rejected are final */
export const NEXT_RETURN_STATUS: Record<ReturnStatus, ReturnStatus[]> = {
    REQUESTED: ['IN_REVIEW', 'APPROVED', 'REJECTED'],
    IN_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['RECEIVED', 'REJECTED'],
    RECEIVED: ['COMPLETED', 'REJECTED'],
    COMPLETED: [],
    REJECTED: [],
};

/** Statuses from which an order can no longer be cancelled (stock already settled) */
const NON_CANCELLABLE: OrderStatus[] = [
    OrderStatus.CANCELLED,
    OrderStatus.RETURNED,
    OrderStatus.DELIVERED,
];

export interface ListOrdersParams {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    cancellationPending?: boolean;
}

class OrderService {
    private buildScopeWhere(scope: Scope): Prisma.OrderWhereInput {
        if (scope.shopId) {
            return {shopId: scope.shopId};
        }
        if (scope.branchId) {
            return {branchId: scope.branchId};
        }
        if (scope.companyId) {
            return {companyId: scope.companyId};
        }
        return {};
    }

    // -------------------------------------------------------------
    // 1. ORDER DASHBOARD
    // -------------------------------------------------------------
    public getDashboard = async (scope: Scope) => {
        const scopeWhere = this.buildScopeWhere(scope);

        const [
            allOrders,
            cancellationRequestsCount,
            returnsCount,
            recentOrders,
        ] = await Promise.all([
            prisma.order.findMany({
                where: scopeWhere,
                select: {
                    id: true,
                    status: true,
                    paymentStatus: true,
                    totalAmount: true,
                },
            }),
            prisma.order.count({
                where: {
                    ...scopeWhere,
                    cancelRequested: true,
                    cancelApproved: null,
                },
            }),
            prisma.returnRequest.count({
                where: scope.shopId
                    ? {shopId: scope.shopId}
                    : scope.companyId
                    ? {companyId: scope.companyId}
                    : {},
            }),
            prisma.order.findMany({
                where: scopeWhere,
                orderBy: {createdAt: 'desc'},
                take: 6,
                include: {
                    customer: {select: {id: true, fullname: true, phoneNumber: true, email: true}},
                    shop: {select: {id: true, name: true, code: true}},
                    items: {
                        take: 2,
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    images: {take: 1, select: {url: true}},
                                },
                            },
                            variant: {select: {size: true, color: true}},
                        },
                    },
                },
            }),
        ]);

        let pending = 0;
        let confirmed = 0;
        let processing = 0;
        let packed = 0;
        let shipped = 0;
        let delivered = 0;
        let cancelled = 0;
        let returned = 0;
        let totalRevenue = 0;

        for (const o of allOrders) {
            if (o.status === 'PENDING') pending++;
            else if (o.status === 'CONFIRMED') confirmed++;
            else if (o.status === 'PROCESSING') processing++;
            else if (o.status === 'PACKED') packed++;
            else if (o.status === 'SHIPPED' || o.status === 'DISPATCHED' || o.status === 'OUT_FOR_DELIVERY') shipped++;
            else if (o.status === 'DELIVERED') {
                delivered++;
                totalRevenue += o.totalAmount;
            } else if (o.status === 'CANCELLED') cancelled++;
            else if (o.status === 'RETURNED') returned++;

            if (o.paymentStatus === 'PAID' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED') {
                totalRevenue += o.totalAmount;
            }
        }

        return {
            totalOrders: allOrders.length,
            pendingOrders: pending,
            confirmedOrders: confirmed,
            processingOrders: processing,
            packedOrders: packed,
            shippedOrders: shipped,
            deliveredOrders: delivered,
            cancelledOrders: cancelled,
            returnedOrders: returned,
            cancellationRequests: cancellationRequestsCount,
            returnRequests: returnsCount,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            recentOrders,
        };
    };

    // -------------------------------------------------------------
    // 2. ORDER LISTING (ADMIN)
    // -------------------------------------------------------------
    public list = async (scope: Scope, params: ListOrdersParams) => {
        const {
            page = 1,
            limit = 15,
            status,
            paymentStatus,
            search,
            startDate,
            endDate,
            cancellationPending,
        } = params;
        const skip = (page - 1) * limit;

        const scopeWhere = this.buildScopeWhere(scope);

        const where: Prisma.OrderWhereInput = {
            ...scopeWhere,
            ...(status ? {status} : {}),
            ...(paymentStatus ? {paymentStatus} : {}),
            ...(cancellationPending ? {cancelRequested: true, cancelApproved: null} : {}),
            ...(startDate || endDate
                ? {
                      createdAt: {
                          ...(startDate ? {gte: new Date(startDate)} : {}),
                          ...(endDate ? {lte: new Date(endDate)} : {}),
                      },
                  }
                : {}),
            ...(search
                ? {
                      OR: [
                          {orderNumber: {contains: search, mode: 'insensitive'}},
                          {customer: {fullname: {contains: search, mode: 'insensitive'}}},
                          {customer: {phoneNumber: {contains: search, mode: 'insensitive'}}},
                          {customer: {email: {contains: search, mode: 'insensitive'}}},
                          {trackingNumber: {contains: search, mode: 'insensitive'}},
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take: limit,
                include: {
                    customer: {select: {id: true, fullname: true, email: true, phoneNumber: true}},
                    branch: {select: {id: true, name: true, code: true}},
                    shop: {select: {id: true, name: true, code: true}},
                    company: {select: {id: true, name: true}},
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    images: {take: 1, select: {url: true}},
                                },
                            },
                            variant: {
                                select: {
                                    id: true,
                                    size: true,
                                    color: true,
                                    variantSku: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    statusHistory: {
                        orderBy: {createdAt: 'desc'},
                        take: 1,
                    },
                },
                orderBy: {createdAt: 'desc'},
            }),
            prisma.order.count({where}),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    // -------------------------------------------------------------
    // 3. ORDER DETAILS (ADMIN)
    // -------------------------------------------------------------
    public get = async (scope: Scope, id: string) => {
        const scopeWhere = this.buildScopeWhere(scope);

        const order = await prisma.order.findFirst({
            where: {
                id,
                ...scopeWhere,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullname: true,
                        email: true,
                        phoneNumber: true,
                        address: true,
                    },
                },
                branch: true,
                shop: true,
                company: true,
                items: {
                    include: {
                        product: {
                            include: {
                                images: true,
                            },
                        },
                        variant: true,
                    },
                },
                statusHistory: {
                    orderBy: {createdAt: 'asc'},
                    include: {
                        updatedBy: {select: {id: true, fullname: true, role: true}},
                    },
                },
                returns: {
                    include: {
                        customer: {select: {id: true, fullname: true, phoneNumber: true}},
                    },
                },
                couponUsages: {
                    include: {
                        coupon: {select: {code: true, discountValue: true, type: true}},
                    },
                },
            },
        });

        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        return order;
    };

    /**
     * Mark the order cancelled and put its items back in stock, exactly once:
     * the conditional update only matches an order that is not yet cancelled,
     * so a repeated or concurrent cancel restores nothing.
     */
    private cancelAndRestock = async (
        tx: Prisma.TransactionClient,
        order: {
            id: string;
            orderNumber: string;
            branchId: string;
            items: Array<{variantId: string; productId: string; quantity: number}>;
        },
        reason: string,
        actorId?: string,
    ) => {
        const {count} = await tx.order.updateMany({
            where: {id: order.id, status: {notIn: NON_CANCELLABLE}},
            data: {status: OrderStatus.CANCELLED},
        });
        if (!count) return;

        await inventoryService.applyStockChanges(tx, {
            branchId: order.branchId,
            changes: order.items.map((item) => ({
                variantId: item.variantId,
                productId: item.productId,
                delta: item.quantity,
                type: MovementType.RETURN_RESTOCK,
            })),
            reason,
            reference: order.orderNumber,
            sourceType: StockSourceType.ORDER,
            sourceId: order.id,
            performedById: actorId,
        });
    };

    // -------------------------------------------------------------
    // 4. ORDER STATUS MANAGEMENT
    // -------------------------------------------------------------
    public updateStatus = async (
        scope: Scope,
        id: string,
        data: {
            status: OrderStatus;
            comment?: string;
            courierName?: string;
            trackingNumber?: string;
        },
        actorId?: string,
    ) => {
        const order = await this.get(scope, id);

        const nextStatus = data.status;
        const comment = data.comment || `Status updated to ${STATUS_NAME(nextStatus)}`;

        if (nextStatus !== order.status && !NEXT_STATUS[order.status].includes(nextStatus)) {
            const allowed = NEXT_STATUS[order.status];
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                allowed.length
                    ? `A ${STATUS_NAME(order.status)} order can only move to: ${allowed.map(STATUS_NAME).join(', ')}`
                    : `A ${STATUS_NAME(order.status)} order cannot change status${order.status === OrderStatus.DELIVERED ? '. Use a return instead.' : ''}`,
            );
        }
        // Online orders are packed only after the money arrives
        if (
            nextStatus !== OrderStatus.CANCELLED &&
            order.status === OrderStatus.PENDING &&
            order.paymentMethod === 'ONLINE' &&
            order.paymentStatus !== PaymentStatus.PAID
        ) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This order is waiting for online payment. Confirm it after the customer pays, or cancel it.');
        }

        // A cancelled order has had its stock restored; reopening it would desync inventory
        if (order.status === OrderStatus.CANCELLED && nextStatus !== OrderStatus.CANCELLED) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                'A cancelled order cannot be reopened. Place a new order instead.',
            );
        }
        if (nextStatus === OrderStatus.CANCELLED && NON_CANCELLABLE.includes(order.status)) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Order cannot be cancelled in "${order.status}" status${order.status === OrderStatus.DELIVERED ? '. Use a return instead.' : ''}`,
            );
        }

        // Auto-mark COD as PAID on delivery
        let paymentStatus = order.paymentStatus;
        if (nextStatus === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentStatus === 'PENDING') {
            paymentStatus = 'PAID';
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (nextStatus === OrderStatus.CANCELLED) {
                await this.cancelAndRestock(
                    tx,
                    order,
                    `Order #${order.orderNumber} cancelled`,
                    actorId,
                );
            }

            const res = await tx.order.update({
                where: {id},
                data: {
                    status: nextStatus,
                    paymentStatus,
                    ...(data.courierName ? {courierName: data.courierName} : {}),
                    ...(data.trackingNumber ? {trackingNumber: data.trackingNumber} : {}),
                },
            });

            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: nextStatus,
                    comment,
                    updatedById: actorId,
                },
            });
            if (nextStatus !== order.status) await notifyOrderStatus(tx, order, nextStatus);

            return res;
        });

        return updated;
    };

    // -------------------------------------------------------------
    // 5. UPDATE SHIPPING & TRACKING
    // -------------------------------------------------------------
    public updateShipping = async (
        scope: Scope,
        id: string,
        data: {
            courierName: string;
            trackingNumber: string;
            status?: OrderStatus;
            comment?: string;
        },
        actorId?: string,
    ) => {
        const order = await this.get(scope, id);

        const targetStatus = data.status || 'SHIPPED';
        // Tracking can be added when shipping, or corrected while it is on the way
        const onTheWay: OrderStatus[] = [OrderStatus.DISPATCHED, OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY];
        if (
            !(targetStatus === order.status && onTheWay.includes(order.status)) &&
            !NEXT_STATUS[order.status].includes(targetStatus)
        ) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                onTheWay.includes(targetStatus) && !onTheWay.includes(order.status)
                    ? `Pack the order before shipping it (it is ${STATUS_NAME(order.status)})`
                    : `A ${STATUS_NAME(order.status)} order cannot be marked ${STATUS_NAME(targetStatus)}`,
            );
        }

        return prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: {id},
                data: {
                    courierName: data.courierName,
                    trackingNumber: data.trackingNumber,
                    status: targetStatus,
                },
            });

            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: targetStatus,
                    comment: data.comment || `Shipment assigned: ${data.courierName} (Tracking: ${data.trackingNumber})`,
                    updatedById: actorId,
                },
            });
            await notifyOrderStatus(tx, order, targetStatus, `Courier: ${data.courierName}, tracking no. ${data.trackingNumber}.`);

            return updated;
        });
    };

    // -------------------------------------------------------------
    // 6. UPDATE PAYMENT STATUS
    // -------------------------------------------------------------
    public updatePayment = async (
        scope: Scope,
        id: string,
        data: {
            paymentStatus: PaymentStatus;
            paymentDetails?: any;
            comment?: string;
        },
        actorId?: string,
    ) => {
        const order = await this.get(scope, id);

        return prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: {id},
                data: {
                    paymentStatus: data.paymentStatus,
                    ...(data.paymentDetails
                        ? {
                              paymentDetails: {
                                  ...(typeof order.paymentDetails === 'object' && order.paymentDetails !== null
                                      ? (order.paymentDetails as object)
                                      : {}),
                                  ...data.paymentDetails,
                                  updatedAt: new Date().toISOString(),
                              },
                          }
                        : {}),
                },
            });

            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: order.status,
                    comment: data.comment || `Payment status changed to ${data.paymentStatus}`,
                    updatedById: actorId,
                },
            });
            if (data.paymentStatus === PaymentStatus.REFUNDED && order.paymentStatus !== PaymentStatus.REFUNDED) {
                await notify(tx, order.customerId, {
                    type: 'PAYMENT',
                    title: 'Refund processed',
                    body: `₹${order.totalAmount.toLocaleString('en-IN')} for order ${order.orderNumber} has been refunded. Banks take 5–7 working days to show it.`,
                    link: `/account/orders/${order.id}`,
                });
            }

            return updated;
        });
    };

    // -------------------------------------------------------------
    // 7. CANCELLATION REVIEW & INVENTORY RESTORATION
    // -------------------------------------------------------------
    public reviewCancellation = async (
        scope: Scope,
        id: string,
        data: {
            approve: boolean;
            reason?: string;
        },
        actorId?: string,
    ) => {
        const order = await this.get(scope, id);

        if (!order.cancelRequested) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'No cancellation request pending for this order');
        }

        if (order.cancelApproved !== null) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Cancellation request has already been reviewed');
        }

        return prisma.$transaction(async (tx) => {
            if (data.approve) {
                // 1. Restore Inventory (once, even if the order was already cancelled)
                await this.cancelAndRestock(
                    tx,
                    order,
                    `Cancellation approved for order #${order.orderNumber}`,
                    actorId,
                );

                // 2. Mark order cancelled and refund payment if paid
                const nextPaymentStatus = order.paymentStatus === 'PAID' ? PaymentStatus.REFUNDED : order.paymentStatus;

                const updated = await tx.order.update({
                    where: {id},
                    data: {
                        status: OrderStatus.CANCELLED,
                        cancelApproved: true,
                        paymentStatus: nextPaymentStatus,
                        cancelRejectionReason: null,
                    },
                });

                await tx.orderStatusHistory.create({
                    data: {
                        orderId: id,
                        status: OrderStatus.CANCELLED,
                        comment: data.reason
                            ? `Cancellation approved: ${data.reason}`
                            : 'Cancellation approved by admin. Inventory restored.',
                        updatedById: actorId,
                    },
                });
                await notifyOrderStatus(
                    tx,
                    order,
                    OrderStatus.CANCELLED,
                    nextPaymentStatus === PaymentStatus.REFUNDED ? 'Your payment will be refunded in 5–7 working days.' : undefined,
                );

                return updated;
            } else {
                // Reject cancellation
                const updated = await tx.order.update({
                    where: {id},
                    data: {
                        cancelApproved: false,
                        cancelRejectionReason: data.reason || 'Cancellation request rejected by admin',
                    },
                });

                await tx.orderStatusHistory.create({
                    data: {
                        orderId: id,
                        status: order.status,
                        comment: `Cancellation rejected: ${data.reason || 'Not approved'}`,
                        updatedById: actorId,
                    },
                });
                await notify(tx, order.customerId, {
                    type: 'ORDER',
                    title: 'Cancellation not possible',
                    body: `We could not cancel order ${order.orderNumber}: ${data.reason || 'it is already on its way'}. You can return it after delivery.`,
                    link: `/account/orders/${order.id}`,
                });

                return updated;
            }
        });
    };

    // -------------------------------------------------------------
    // 8. RETURNS MANAGEMENT
    // -------------------------------------------------------------
    public listReturns = async (scope: Scope, params: {page?: number; limit?: number; status?: ReturnStatus}) => {
        const {page = 1, limit = 20, status} = params;
        const skip = (page - 1) * limit;

        const where: Prisma.ReturnRequestWhereInput = {
            ...(scope.shopId
                ? {shopId: scope.shopId}
                : scope.branchId
                ? {order: {branchId: scope.branchId}}
                : scope.companyId
                ? {companyId: scope.companyId}
                : {}),
            ...(status ? {returnStatus: status} : {}),
        };

        const [items, total] = await Promise.all([
            prisma.returnRequest.findMany({
                where,
                skip,
                take: limit,
                include: {
                    customer: {select: {id: true, fullname: true, phoneNumber: true, email: true}},
                    order: {
                        select: {
                            id: true,
                            orderNumber: true,
                            totalAmount: true,
                            branch: {select: {id: true, name: true}},
                            shop: {select: {id: true, name: true}},
                            items: {
                                include: {
                                    product: {select: {name: true, images: {take: 1, select: {url: true}}}},
                                    variant: {select: {size: true, color: true, variantSku: true}},
                                },
                            },
                        },
                    },
                },
                orderBy: {createdAt: 'desc'},
            }),
            prisma.returnRequest.count({where}),
        ]);

        return {
            // What is actually coming back: the returned lines, not the whole order
            items: items.map((r) => ({
                ...r,
                lines: returnedLines(r.order.items, r.returnItems).map(({item, quantity}) => ({
                    orderItemId: item.id,
                    name: item.productName ?? item.product?.name,
                    size: item.size ?? item.variant?.size,
                    color: item.color ?? item.variant?.color,
                    image: item.image ?? item.product?.images?.[0]?.url ?? null,
                    unitPrice: item.unitPrice,
                    quantity,
                })),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    public updateReturnStatus = async (
        scope: Scope,
        returnId: string,
        data: {
            returnStatus?: ReturnStatus;
            refundStatus?: RefundStatus;
            notes?: string;
            restock?: boolean;
        },
        actorId?: string,
    ) => {
        const item = await prisma.returnRequest.findFirst({
            where: {
                id: returnId,
                ...(scope.shopId
                    ? {shopId: scope.shopId}
                    : scope.companyId
                    ? {companyId: scope.companyId}
                    : {}),
            },
            include: {
                order: {
                    include: {items: true},
                },
            },
        });

        if (!item) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Return request not found');
        }
        if (data.returnStatus && data.returnStatus !== item.returnStatus && !NEXT_RETURN_STATUS[item.returnStatus].includes(data.returnStatus)) {
            const allowed = NEXT_RETURN_STATUS[item.returnStatus];
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                allowed.length
                    ? `A ${STATUS_NAME(item.returnStatus)} return can only move to: ${allowed.map(STATUS_NAME).join(', ')}`
                    : `This return is ${STATUS_NAME(item.returnStatus)} and cannot change`,
            );
        }
        const nextReturn = data.returnStatus ?? item.returnStatus;
        if (item.resolution === 'EXCHANGE' && data.refundStatus && data.refundStatus !== 'NONE') {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This is an exchange: send the new size instead of a refund');
        }
        // Money goes back only once the item is back with the shop
        if (data.refundStatus === 'PROCESSED' && !['RECEIVED', 'COMPLETED'].includes(nextReturn)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Mark the item as received before refunding');
        }

        return prisma.$transaction(async (tx) => {
            // If restock is explicitly requested or when completing return with restock
            if (data.restock && (data.returnStatus === 'RECEIVED' || data.returnStatus === 'COMPLETED')) {
                // Restock a return only once (RECEIVED and COMPLETED may both ask for it)
                const alreadyRestocked = await tx.stockMovement.count({
                    where: {sourceType: StockSourceType.RETURN, sourceId: returnId},
                });
                if (!alreadyRestocked) {
                    await inventoryService.applyStockChanges(tx, {
                        branchId: item.order.branchId,
                        changes: returnedLines(item.order.items, item.returnItems).map(({item: orderItem, quantity}) => ({
                            variantId: orderItem.variantId,
                            productId: orderItem.productId,
                            delta: quantity,
                            type: MovementType.RETURN_RESTOCK,
                        })),
                        reason: `Return restocked for Order #${item.order.orderNumber}`,
                        reference: item.order.orderNumber,
                        sourceType: StockSourceType.RETURN,
                        sourceId: returnId,
                        performedById: actorId,
                    });
                }
            }

            const updated = await tx.returnRequest.update({
                where: {id: returnId},
                data: {
                    ...(data.returnStatus ? {returnStatus: data.returnStatus} : {}),
                    ...(data.refundStatus ? {refundStatus: data.refundStatus} : {}),
                    ...(data.notes ? {notes: data.notes} : {}),
                },
            });

            // A refund for the whole order closes it as returned; part returns and exchanges leave it delivered
            const lines = returnedLines(item.order.items, item.returnItems);
            const wholeOrder =
                lines.reduce((n, l) => n + l.quantity, 0) === item.order.items.reduce((n, i) => n + i.quantity, 0);
            if (
                item.resolution === 'REFUND' &&
                wholeOrder &&
                (data.refundStatus === 'PROCESSED' || data.refundStatus === 'APPROVED')
            ) {
                await tx.order.update({
                    where: {id: item.orderId},
                    data: {
                        status: OrderStatus.RETURNED,
                        paymentStatus: PaymentStatus.REFUNDED,
                    },
                });
            }

            const no = item.order.orderNumber;
            const link = '/account/returns';
            const amount = `₹${(item.refundAmount ?? 0).toLocaleString('en-IN')}`;
            const changed = (to: string) => data.returnStatus === to && item.returnStatus !== to;
            const messages: {when: boolean; title: string; body: string}[] = [
                {when: changed('APPROVED'), title: 'Return approved', body: `Your return for order ${no} is approved. Our courier will pick it up in 1–2 days.`},
                {when: changed('REJECTED'), title: 'Return not approved', body: `We could not accept the return for order ${no}${data.notes ? `: ${data.notes}` : '.'}`},
                {when: changed('RECEIVED'), title: 'Return received', body: `We have received the items from order ${no} and are checking them.`},
                {when: changed('COMPLETED') && item.resolution === 'EXCHANGE', title: 'Exchange shipped', body: `Your exchange for order ${no}${item.exchangeFor ? ` (${item.exchangeFor})` : ''} is on its way.`},
                {when: data.refundStatus === 'PROCESSED' && item.refundStatus !== 'PROCESSED', title: 'Refund processed', body: `${amount} for your return from order ${no} has been refunded. Banks take 5–7 working days to show it.`},
            ];
            for (const m of messages.filter((x) => x.when)) {
                await notify(tx, item.customerId, {type: 'RETURN', title: m.title, body: m.body, link});
            }

            return updated;
        });
    };

    // -------------------------------------------------------------
    // 9. INVOICE DATA RETRIEVAL
    // -------------------------------------------------------------
    public getInvoiceData = async (scope: Scope, id: string) => {
        const order = await this.get(scope, id);
        return order;
    };

    // -------------------------------------------------------------
    // 10. CUSTOMER / USER ORDER API
    // -------------------------------------------------------------
    public listCustomerOrders = async (customerId: string, params: {page?: number; limit?: number; status?: OrderStatus}) => {
        const {page = 1, limit = 15, status} = params;
        const skip = (page - 1) * limit;

        const where: Prisma.OrderWhereInput = {
            customerId,
            ...(status ? {status} : {}),
        };

        const [items, total] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take: limit,
                include: {
                    shop: {select: {id: true, name: true, phone: true}},
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    images: {take: 1, select: {url: true}},
                                },
                            },
                            variant: {
                                select: {
                                    id: true,
                                    size: true,
                                    color: true,
                                    variantSku: true,
                                    image: true,
                                },
                            },
                        },
                    },
                    statusHistory: {
                        orderBy: {createdAt: 'desc'},
                        take: 1,
                    },
                },
                orderBy: {createdAt: 'desc'},
            }),
            prisma.order.count({where}),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    };

    public getCustomerOrder = async (customerId: string, id: string) => {
        const order = await prisma.order.findFirst({
            where: {id, customerId},
            include: {
                shop: {select: {id: true, name: true, phone: true, address: true}},
                items: {
                    include: {
                        product: {include: {images: true}},
                        variant: true,
                    },
                },
                statusHistory: {
                    orderBy: {createdAt: 'asc'},
                },
                returns: true,
            },
        });

        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        return order;
    };

    public requestCustomerCancellation = async (customerId: string, id: string, reason: string) => {
        const order = await prisma.order.findFirst({
            where: {id, customerId},
        });

        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                `Order cannot be cancelled in "${order.status}" status. It is already being processed or dispatched.`,
            );
        }

        if (order.cancelRequested) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Cancellation request is already pending review');
        }

        return prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: {id},
                data: {
                    cancelRequested: true,
                    cancelRequestedAt: new Date(),
                    cancelReason: reason,
                },
            });

            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: order.status,
                    comment: `Customer requested order cancellation: "${reason}"`,
                    updatedById: customerId,
                },
            });

            return updated;
        });
    };

    public requestCustomerReturn = async (
        customerId: string,
        id: string,
        data: {reason: string; description?: string; returnItems?: any[]},
    ) => {
        const order = await prisma.order.findFirst({
            where: {id, customerId},
        });

        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        if (order.status !== 'DELIVERED') {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Return can only be requested after the order has been delivered');
        }

        return prisma.returnRequest.create({
            data: {
                orderId: id,
                customerId,
                companyId: order.companyId,
                shopId: order.shopId,
                reason: data.reason,
                description: data.description,
                refundAmount: order.totalAmount,
                returnStatus: ReturnStatus.REQUESTED,
                returnItems: data.returnItems ? (data.returnItems as unknown as Prisma.InputJsonValue) : undefined,
            },
        });
    };
}

export default new OrderService();
