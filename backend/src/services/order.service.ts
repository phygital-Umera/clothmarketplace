import {Prisma, OrderStatus, PaymentStatus, ReturnStatus, RefundStatus, MovementType} from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {Scope} from './account.service';

export interface CreateCustomerOrderInput {
    companyId?: string;
    branchId?: string;
    shopId?: string;
    items: Array<{
        productId: string;
        variantId: string;
        quantity: number;
    }>;
    shippingAddress: {
        recipient: string;
        phone: string;
        address1: string;
        address2?: string;
        city: string;
        district?: string;
        state: string;
        postalCode: string;
        country?: string;
    };
    paymentMethod?: string; // 'COD' | 'ONLINE'
    paymentDetails?: any;
    couponCode?: string;
    notes?: string;
}

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
        const comment = data.comment || `Status updated to ${nextStatus}`;

        // Auto-mark COD as PAID on delivery
        let paymentStatus = order.paymentStatus;
        if (nextStatus === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentStatus === 'PENDING') {
            paymentStatus = 'PAID';
        }

        const updated = await prisma.$transaction(async (tx) => {
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
        await this.get(scope, id);

        const targetStatus = data.status || 'SHIPPED';

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
                // 1. Restore Inventory
                for (const item of order.items) {
                    const inv = await tx.inventory.findUnique({
                        where: {
                            branchId_variantId: {
                                branchId: order.branchId,
                                variantId: item.variantId,
                            },
                        },
                    });

                    const prev = inv?.physicalQty ?? 0;
                    const next = prev + item.quantity;

                    await tx.inventory.upsert({
                        where: {
                            branchId_variantId: {
                                branchId: order.branchId,
                                variantId: item.variantId,
                            },
                        },
                        create: {
                            branchId: order.branchId,
                            variantId: item.variantId,
                            physicalQty: item.quantity,
                        },
                        update: {
                            physicalQty: {increment: item.quantity},
                        },
                    });

                    // Update product aggregated stock
                    await tx.product.update({
                        where: {id: item.productId},
                        data: {
                            stockQuantity: {increment: item.quantity},
                        },
                    });

                    // Log stock movement
                    await tx.stockMovement.create({
                        data: {
                            branchId: order.branchId,
                            variantId: item.variantId,
                            type: MovementType.RETURN_RESTOCK,
                            quantity: item.quantity,
                            prevPhysical: prev,
                            newPhysical: next,
                            reason: `Cancellation approved for order #${order.orderNumber}`,
                            reference: order.orderNumber,
                            performedById: actorId,
                        },
                    });
                }

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
            items,
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

        return prisma.$transaction(async (tx) => {
            // If restock is explicitly requested or when completing return with restock
            if (data.restock && (data.returnStatus === 'RECEIVED' || data.returnStatus === 'COMPLETED')) {
                for (const orderItem of item.order.items) {
                    const inv = await tx.inventory.findUnique({
                        where: {
                            branchId_variantId: {
                                branchId: item.order.branchId,
                                variantId: orderItem.variantId,
                            },
                        },
                    });

                    const prev = inv?.physicalQty ?? 0;
                    const next = prev + orderItem.quantity;

                    await tx.inventory.upsert({
                        where: {
                            branchId_variantId: {
                                branchId: item.order.branchId,
                                variantId: orderItem.variantId,
                            },
                        },
                        create: {
                            branchId: item.order.branchId,
                            variantId: orderItem.variantId,
                            physicalQty: orderItem.quantity,
                        },
                        update: {
                            physicalQty: {increment: orderItem.quantity},
                        },
                    });

                    await tx.product.update({
                        where: {id: orderItem.productId},
                        data: {stockQuantity: {increment: orderItem.quantity}},
                    });

                    await tx.stockMovement.create({
                        data: {
                            branchId: item.order.branchId,
                            variantId: orderItem.variantId,
                            type: MovementType.RETURN_RESTOCK,
                            quantity: orderItem.quantity,
                            prevPhysical: prev,
                            newPhysical: next,
                            reason: `Return restocked for Order #${item.order.orderNumber}`,
                            reference: item.order.orderNumber,
                            performedById: actorId,
                        },
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

            // If return is approved / completed and refund is processed, update order refund status
            if (data.refundStatus === 'PROCESSED' || data.refundStatus === 'APPROVED') {
                await tx.order.update({
                    where: {id: item.orderId},
                    data: {
                        status: OrderStatus.RETURNED,
                        paymentStatus: PaymentStatus.REFUNDED,
                    },
                });
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
    public createCustomerOrder = async (customerId: string, input: CreateCustomerOrderInput) => {
        const {items, shippingAddress, paymentMethod = 'COD', couponCode, notes, paymentDetails} = input;

        if (!items || items.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Order must contain at least one product item');
        }

        if (!shippingAddress || !shippingAddress.recipient || !shippingAddress.phone || !shippingAddress.address1) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Complete delivery address is required');
        }

        // Fetch products, variants, and stock
        const variantIds = items.map((i) => i.variantId);
        const variants = await prisma.productVariant.findMany({
            where: {id: {in: variantIds}},
            include: {
                product: {
                    include: {
                        shop: true,
                        company: true,
                        images: {take: 1},
                    },
                },
                inventories: true,
            },
        });

        if (variants.length !== items.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'One or more selected product variants were not found');
        }

        const variantMap = new Map(variants.map((v) => [v.id, v]));

        // Determine shop, branch, company from products
        const firstVariant = variants[0];
        const companyId = input.companyId || firstVariant.product.companyId;
        const shopId = input.shopId || firstVariant.product.shopId || undefined;
        const branchId = input.branchId || firstVariant.product.shop?.branchId || firstVariant.inventories[0]?.branchId;

        if (!branchId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Unable to determine branch for order fulfillment');
        }

        // Calculate item totals and verify stock
        let subtotal = 0;
        const processedItems: Array<{
            productId: string;
            variantId: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            productName: string;
            variantSku: string;
            size: string;
            color: string;
            image?: string;
        }> = [];

        for (const item of items) {
            const v = variantMap.get(item.variantId);
            if (!v || !v.isActive) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Selected variant is no longer available`);
            }

            const inv = v.inventories.find((i) => i.branchId === branchId);
            const availableStock = inv ? inv.physicalQty - inv.reservedQty : 0;
            if (availableStock < item.quantity) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    `Insufficient stock for "${v.product.name}" (${v.size} / ${v.color}). Available: ${Math.max(0, availableStock)}`,
                );
            }

            const unitPrice = v.sellingPrice ?? v.mrp ?? 0;
            const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
            subtotal += totalPrice;

            processedItems.push({
                productId: v.productId,
                variantId: v.id,
                quantity: item.quantity,
                unitPrice,
                totalPrice,
                productName: v.product.name,
                variantSku: v.variantSku,
                size: v.size,
                color: v.color,
                image: v.image || v.product.images[0]?.url,
            });
        }

        subtotal = Math.round(subtotal * 100) / 100;

        // Apply coupon discount if provided
        let couponDiscount = 0;
        let validCouponId: string | undefined = undefined;

        if (couponCode) {
            const normalizedCode = couponCode.trim().toUpperCase();
            const now = new Date();
            const coupon = await prisma.coupon.findFirst({
                where: {
                    code: normalizedCode,
                    isActive: true,
                    startDate: {lte: now},
                    endDate: {gte: now},
                    OR: [
                        {companyId},
                        {companyId: null},
                    ],
                },
            });

            if (coupon) {
                if (!coupon.minPurchaseAmount || subtotal >= coupon.minPurchaseAmount) {
                    if (coupon.type === 'PERCENTAGE') {
                        let disc = (subtotal * coupon.discountValue) / 100;
                        if (coupon.maxDiscountLimit && disc > coupon.maxDiscountLimit) {
                            disc = coupon.maxDiscountLimit;
                        }
                        couponDiscount = Math.round(disc * 100) / 100;
                    } else {
                        couponDiscount = Math.min(coupon.discountValue, subtotal);
                    }
                    validCouponId = coupon.id;
                }
            }
        }

        const shippingFee = subtotal >= 999 ? 0 : 50;
        const totalAmount = Math.max(0, Math.round((subtotal - couponDiscount + shippingFee) * 100) / 100);

        // Generate unique Order Number: ORD-YYYYMMDD-XXXXX
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
        const orderNumber = `ORD-${dateStr}-${randStr}`;

        const initialPaymentStatus = paymentMethod === 'ONLINE' && paymentDetails?.transactionId
            ? PaymentStatus.PAID
            : PaymentStatus.PENDING;

        // Atomic transaction: create order, deduct stock, record movements, update coupon
        return prisma.$transaction(async (tx) => {
            // 1. Create Order
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    customerId,
                    companyId,
                    branchId,
                    shopId,
                    status: OrderStatus.PENDING,
                    paymentStatus: initialPaymentStatus,
                    paymentMethod,
                    subtotal,
                    discount: 0,
                    couponDiscount,
                    couponCode: validCouponId ? couponCode?.trim().toUpperCase() : null,
                    shippingFee,
                    totalAmount,
                    shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue,
                    notes,
                    paymentDetails: paymentDetails ? (paymentDetails as unknown as Prisma.InputJsonValue) : undefined,
                    items: {
                        create: processedItems.map((pi) => ({
                            productId: pi.productId,
                            variantId: pi.variantId,
                            quantity: pi.quantity,
                            unitPrice: pi.unitPrice,
                            totalPrice: pi.totalPrice,
                            productName: pi.productName,
                            variantSku: pi.variantSku,
                            size: pi.size,
                            color: pi.color,
                            image: pi.image,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });

            // 2. Deduct inventory & log stock movement
            for (const item of processedItems) {
                const inv = await tx.inventory.findUnique({
                    where: {
                        branchId_variantId: {
                            branchId,
                            variantId: item.variantId,
                        },
                    },
                });

                const prev = inv?.physicalQty ?? 0;
                const next = Math.max(0, prev - item.quantity);

                await tx.inventory.upsert({
                    where: {
                        branchId_variantId: {
                            branchId,
                            variantId: item.variantId,
                        },
                    },
                    create: {
                        branchId,
                        variantId: item.variantId,
                        physicalQty: next,
                    },
                    update: {
                        physicalQty: {decrement: item.quantity},
                    },
                });

                await tx.product.update({
                    where: {id: item.productId},
                    data: {
                        stockQuantity: {decrement: item.quantity},
                    },
                });

                await tx.stockMovement.create({
                    data: {
                        branchId,
                        variantId: item.variantId,
                        type: MovementType.SALE_OUT,
                        quantity: item.quantity,
                        prevPhysical: prev,
                        newPhysical: next,
                        reason: `Order #${orderNumber} placed`,
                        reference: orderNumber,
                        performedById: customerId,
                    },
                });
            }

            // 3. Record coupon usage if applied
            if (validCouponId) {
                await tx.coupon.update({
                    where: {id: validCouponId},
                    data: {usedCount: {increment: 1}},
                });

                await tx.couponUsage.create({
                    data: {
                        couponId: validCouponId,
                        userId: customerId,
                        orderId: newOrder.id,
                        discountAmount: couponDiscount,
                    },
                });
            }

            // 4. Record initial status history
            await tx.orderStatusHistory.create({
                data: {
                    orderId: newOrder.id,
                    status: OrderStatus.PENDING,
                    comment: 'Order placed successfully by customer',
                    updatedById: customerId,
                },
            });

            return newOrder;
        });
    };

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
