import {Prisma, OrderStatus, PaymentStatus, ReturnStatus, RefundStatus} from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {Scope} from './account.service';

export interface CreateOrderInput {
    companyId: string;
    branchId: string;
    items: {
        productId: string;
        variantId: string;
        quantity: number;
    }[];
    shippingAddress: Prisma.InputJsonValue;
    paymentMethod?: string;
}

class OrderService {
    // List orders scoped to Super Admin, Company Admin, or Branch Admin
    public list = async (
        scope: Scope,
        params: {
            page?: number;
            limit?: number;
            status?: OrderStatus;
            paymentStatus?: PaymentStatus;
            search?: string;
        },
    ) => {
        const {page = 1, limit = 20, status, paymentStatus, search} = params;
        const skip = (page - 1) * limit;

        const where: Prisma.OrderWhereInput = {
            ...(scope.companyId ? {companyId: scope.companyId} : {}),
            ...(scope.branchId ? {branchId: scope.branchId} : {}),
            ...(status ? {status} : {}),
            ...(paymentStatus ? {paymentStatus} : {}),
            ...(search
                ? {
                      OR: [
                          {orderNumber: {contains: search, mode: 'insensitive'}},
                          {customer: {fullname: {contains: search, mode: 'insensitive'}}},
                          {customer: {phoneNumber: {contains: search, mode: 'insensitive'}}},
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
                    company: {select: {id: true, name: true}},
                    items: {
                        include: {
                            product: {select: {name: true, sku: true}},
                            variant: {select: {size: true, color: true, variantSku: true}},
                        },
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

    // Get order details
    public get = async (scope: Scope, id: string) => {
        const order = await prisma.order.findFirst({
            where: {
                id,
                ...(scope.companyId ? {companyId: scope.companyId} : {}),
                ...(scope.branchId ? {branchId: scope.branchId} : {}),
            },
            include: {
                customer: true,
                branch: true,
                company: true,
                items: {
                    include: {
                        product: {include: {images: true}},
                        variant: true,
                    },
                },
                tasks: {include: {assignedTo: {select: {id: true, fullname: true, role: true}}}},
                returns: true,
            },
        });

        if (!order) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        }

        return order;
    };

    // Update Order Status (Processing, Packing, Dispatch, Delivery)
    public updateStatus = async (
        scope: Scope,
        id: string,
        status: OrderStatus,
        trackingNumber?: string,
    ) => {
        await this.get(scope, id);

        return prisma.order.update({
            where: {id},
            data: {
                status,
                ...(trackingNumber ? {trackingNumber} : {}),
            },
        });
    };

    // Returns Management
    public listReturns = async (scope: Scope, params: {page?: number; limit?: number}) => {
        const {page = 1, limit = 20} = params;
        const skip = (page - 1) * limit;

        const where: Prisma.ReturnRequestWhereInput = {
            ...(scope.companyId ? {companyId: scope.companyId} : {}),
            ...(scope.branchId ? {order: {branchId: scope.branchId}} : {}),
        };

        const [items, total] = await Promise.all([
            prisma.returnRequest.findMany({
                where,
                skip,
                take: limit,
                include: {
                    customer: {select: {id: true, fullname: true, phoneNumber: true}},
                    order: {
                        select: {
                            orderNumber: true,
                            totalAmount: true,
                            branch: {select: {name: true}},
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

    // Process Return / Refund
    public updateReturnStatus = async (
        scope: Scope,
        returnId: string,
        data: {returnStatus?: ReturnStatus; refundStatus?: RefundStatus; notes?: string},
    ) => {
        const item = await prisma.returnRequest.findFirst({
            where: {
                id: returnId,
                ...(scope.companyId ? {companyId: scope.companyId} : {}),
            },
        });

        if (!item) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Return request not found');
        }

        return prisma.returnRequest.update({
            where: {id: returnId},
            data: {
                ...(data.returnStatus ? {returnStatus: data.returnStatus} : {}),
                ...(data.refundStatus ? {refundStatus: data.refundStatus} : {}),
                ...(data.notes ? {notes: data.notes} : {}),
            },
        });
    };
}

export default new OrderService();
