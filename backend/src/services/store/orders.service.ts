import httpStatus from 'http-status';
import {MovementType, OrderStatus, PaymentStatus, Prisma, ReturnStatus, StockSourceType} from '@prisma/client';
import {z} from 'zod';
import prisma from '../../client';
import ApiError from '@utils/ApiError';
import {field} from '../../validations/custom.validation';
import inventoryService from '../inventory.service';
import {notify} from '../notification.service';
import {returnedLines} from '../order.service';
import customerService from './customer.service';

/*
 * The customer's orders on the store: list with tabs, tracking, invoice,
 * cancel, item-by-item returns / exchanges and "buy again".
 */

const round2 = (v: number) => Math.round(v * 100) / 100;
const DAY = 86_400_000;

export const ORDER_TABS = ['all', 'active', 'delivered', 'cancelled', 'returns'] as const;
const ACTIVE: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.PACKED,
    OrderStatus.READY_FOR_DISPATCH,
    OrderStatus.DISPATCHED,
    OrderStatus.SHIPPED,
    OrderStatus.OUT_FOR_DELIVERY,
];

/** The six steps the customer sees, and which order statuses belong to each */
const STEPS: {key: string; label: string; statuses: OrderStatus[]}[] = [
    {key: 'PLACED', label: 'Order placed', statuses: [OrderStatus.PENDING]},
    {key: 'CONFIRMED', label: 'Confirmed', statuses: [OrderStatus.CONFIRMED]},
    {key: 'PACKED', label: 'Packed', statuses: [OrderStatus.PROCESSING, OrderStatus.PACKED, OrderStatus.READY_FOR_DISPATCH]},
    {key: 'SHIPPED', label: 'Shipped', statuses: [OrderStatus.DISPATCHED, OrderStatus.SHIPPED]},
    {key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', statuses: [OrderStatus.OUT_FOR_DELIVERY]},
    {key: 'DELIVERED', label: 'Delivered', statuses: [OrderStatus.DELIVERED]},
];

export const RETURN_REASONS = [
    'Size too small',
    'Size too large',
    'Damaged or defective',
    'Different from what I ordered',
    'Colour different from the photos',
    'Quality not as expected',
    'Changed my mind',
] as const;

export const cancelSchema = z.object({
    reason: field({label: 'Reason', kind: 'text', max: 200, required: false}),
});

export const returnSchema = z
    .object({
        items: z
            .array(
                z.object({
                    orderItemId: z.string().uuid('Choose an item'),
                    quantity: z.coerce.number().int().min(1).max(10),
                }),
            )
            .min(1, 'Choose at least one item to return'),
        reason: z.enum(RETURN_REASONS, {errorMap: () => ({message: 'Choose a reason'})}),
        details: field({label: 'Details', kind: 'text', max: 500, required: false}),
        resolution: z.enum(['REFUND', 'EXCHANGE'], {errorMap: () => ({message: 'Choose refund or exchange'})}),
        exchangeFor: field({label: 'Size or colour wanted', kind: 'text', max: 60, required: false}),
        images: z.array(z.string().url('Upload the photo again').max(500)).max(4, 'Up to 4 photos').default([]),
    })
    .refine((v) => v.resolution !== 'EXCHANGE' || !!v.exchangeFor, {
        message: 'Tell us the size or colour you want instead',
        path: ['exchangeFor'],
    });

const ORDER_INCLUDE = {
    shop: {select: {id: true, name: true, phone: true, address: true, gstin: true}},
    company: {select: {name: true, address: true, city: true, state: true, postalCode: true}},
    items: {
        include: {
            product: {
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    taxRate: true,
                    returnEligible: true,
                    returnPeriodDays: true,
                    status: true,
                    images: {orderBy: [{isMain: 'desc'}, {order: 'asc'}], take: 1, select: {url: true}},
                },
            },
        },
    },
    statusHistory: {orderBy: {createdAt: 'asc'}},
    returns: {orderBy: {createdAt: 'desc'}},
} satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{include: typeof ORDER_INCLUDE}>;

const deliveredAt = (o: OrderRow) =>
    o.status === OrderStatus.DELIVERED
        ? [...o.statusHistory].reverse().find((h) => h.status === OrderStatus.DELIVERED)?.createdAt ?? o.updatedAt
        : null;

/** Quantity of each order line already in an open or finished return */
const returnedQty = (o: OrderRow) => {
    const used: Record<string, number> = {};
    for (const r of o.returns.filter((x) => x.returnStatus !== ReturnStatus.REJECTED)) {
        for (const {item, quantity} of returnedLines(o.items, r.returnItems)) used[item.id] = (used[item.id] ?? 0) + quantity;
    }
    return used;
};

/** What the customer gets back for a line: its share of the price after the coupon (delivery is not refunded) */
const refundFor = (o: {subtotal: number; couponDiscount: number}, unitPrice: number, quantity: number) =>
    o.subtotal > 0 ? round2(((unitPrice * quantity) / o.subtotal) * (o.subtotal - o.couponDiscount)) : 0;

const shape = (o: OrderRow) => {
    const delivered = deliveredAt(o);
    const used = returnedQty(o);
    const now = Date.now();
    const address = (o.shippingAddress ?? {}) as Record<string, unknown>;
    const delivery = (address.delivery as string) ?? 'STANDARD';

    const items = o.items.map((i) => {
        const until = delivered ? new Date(delivered.getTime() + (i.product.returnPeriodDays ?? 7) * DAY) : null;
        const left = i.quantity - (used[i.id] ?? 0);
        const returnable = !!until && i.product.returnEligible && until.getTime() >= now && left > 0;
        return {
            id: i.id,
            productId: i.productId,
            slug: i.product.slug,
            variantId: i.variantId,
            name: i.productName ?? i.product.name,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            image: i.image ?? i.product.images[0]?.url ?? null,
            taxRate: i.product.taxRate,
            returnUntil: until,
            returnableQty: returnable ? left : 0,
            returnedQty: used[i.id] ?? 0,
            refundPerUnit: refundFor(o, i.unitPrice, 1),
        };
    });

    // Tracking: the furthest step reached, with the date each step happened
    const reachedAt = (statuses: OrderStatus[]) => o.statusHistory.find((h) => statuses.includes(h.status))?.createdAt ?? null;
    const currentIdx = STEPS.findIndex((s) => s.statuses.includes(o.status));
    const steps = STEPS.map((s, i) => ({
        key: s.key,
        label: s.label,
        at: reachedAt(s.statuses) ?? (i === 0 ? o.createdAt : null),
        done: currentIdx >= 0 && i <= currentIdx,
        current: i === currentIdx,
    }));
    const expected =
        delivery === 'PICKUP' ? null : new Date(o.createdAt.getTime() + (delivery === 'EXPRESS' ? 2 : 5) * DAY);

    const cancellable =
        (o.status === OrderStatus.PENDING || o.status === OrderStatus.CONFIRMED) && !o.cancelRequested;
    const hasReturn = o.returns.length > 0;

    return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        paymentDetails: o.paymentDetails as {razorpayOrderId?: string; razorpayPaymentId?: string; lastError?: string} | null,
        subtotal: o.subtotal,
        couponDiscount: o.couponDiscount,
        couponCode: o.couponCode,
        shippingFee: o.shippingFee,
        totalAmount: o.totalAmount,
        taxIncluded: round2(items.reduce((n, i) => n + (i.totalPrice * i.taxRate) / (100 + i.taxRate), 0)),
        shippingAddress: o.shippingAddress,
        delivery,
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        cancelRequested: o.cancelRequested,
        cancelApproved: o.cancelApproved,
        cancelRejectionReason: o.cancelRejectionReason,
        createdAt: o.createdAt,
        deliveredAt: delivered,
        expectedBy: ACTIVE.includes(o.status) ? expected : null,
        shop: o.shop,
        seller: o.company,
        items,
        steps,
        history: o.statusHistory.map((h) => ({id: h.id, status: h.status, comment: h.comment, createdAt: h.createdAt})),
        returns: o.returns.map((r) => ({
            id: r.id,
            reason: r.reason,
            description: r.description,
            resolution: r.resolution,
            exchangeFor: r.exchangeFor,
            images: r.images,
            returnStatus: r.returnStatus,
            refundStatus: r.refundStatus,
            refundAmount: r.refundAmount,
            createdAt: r.createdAt,
            items: returnedLines(o.items, r.returnItems).map(({item, quantity}) => ({
                orderItemId: item.id,
                name: item.productName ?? item.product.name,
                size: item.size,
                color: item.color,
                image: item.image ?? item.product.images[0]?.url ?? null,
                quantity,
            })),
        })),
        can: {
            cancel: cancellable,
            track: o.status !== OrderStatus.CANCELLED,
            return: items.some((i) => i.returnableQty > 0),
            review: o.status === OrderStatus.DELIVERED,
            invoice: o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.PENDING,
            buyAgain: o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED || o.status === OrderStatus.RETURNED,
            pay:
                o.paymentMethod === 'ONLINE' &&
                o.paymentStatus !== PaymentStatus.PAID &&
                o.paymentStatus !== PaymentStatus.REFUNDED &&
                o.status !== OrderStatus.CANCELLED,
        },
        tab: o.status === OrderStatus.CANCELLED ? 'cancelled' : o.status === OrderStatus.RETURNED || hasReturn ? 'returns' : o.status === OrderStatus.DELIVERED ? 'delivered' : 'active',
    };
};
export type StoreOrder = ReturnType<typeof shape>;

class StoreOrderService {
    private async load(userId: string, id: string) {
        const order = await prisma.order.findFirst({where: {id, customerId: userId}, include: ORDER_INCLUDE});
        if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
        return order;
    }

    public async list(userId: string, tab: (typeof ORDER_TABS)[number], q?: string) {
        const search = q?.trim();
        const where: Prisma.OrderWhereInput = {
            customerId: userId,
            ...(tab === 'active' ? {status: {in: ACTIVE}} : {}),
            ...(tab === 'delivered' ? {status: OrderStatus.DELIVERED, returns: {none: {}}} : {}),
            ...(tab === 'cancelled' ? {status: OrderStatus.CANCELLED} : {}),
            ...(tab === 'returns' ? {OR: [{status: OrderStatus.RETURNED}, {returns: {some: {}}}]} : {}),
            ...(search
                ? {
                      AND: [
                          {
                              OR: [
                                  {orderNumber: {contains: search, mode: 'insensitive'}},
                                  {items: {some: {productName: {contains: search, mode: 'insensitive'}}}},
                              ],
                          },
                      ],
                  }
                : {}),
        };
        const [rows, all] = await Promise.all([
            prisma.order.findMany({where, include: ORDER_INCLUDE, orderBy: {createdAt: 'desc'}, take: 50}),
            prisma.order.findMany({
                where: {customerId: userId},
                select: {status: true, _count: {select: {returns: true}}},
            }),
        ]);
        const counts = {
            all: all.length,
            active: all.filter((o) => ACTIVE.includes(o.status)).length,
            delivered: all.filter((o) => o.status === OrderStatus.DELIVERED && !o._count.returns).length,
            cancelled: all.filter((o) => o.status === OrderStatus.CANCELLED).length,
            returns: all.filter((o) => o.status === OrderStatus.RETURNED || o._count.returns > 0).length,
        };
        return {items: rows.map(shape), counts};
    }

    public async get(userId: string, id: string) {
        return shape(await this.load(userId, id));
    }

    /**
     * Before the shop packs it, an unpaid order is cancelled at once and its
     * stock goes back. A paid order needs the shop to refund, so it becomes a
     * cancellation request.
     */
    public async cancel(userId: string, id: string, reason?: string) {
        const order = await this.load(userId, id);
        const why = reason || 'Cancelled by customer';
        if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This order is already packed or on its way, so it cannot be cancelled. You can return it after delivery.');
        }
        if (order.cancelRequested) throw new ApiError(httpStatus.BAD_REQUEST, 'You have already asked to cancel this order');

        if (order.paymentStatus === PaymentStatus.PAID) {
            await prisma.$transaction(async (tx) => {
                await tx.order.update({where: {id}, data: {cancelRequested: true, cancelRequestedAt: new Date(), cancelReason: why}});
                await tx.orderStatusHistory.create({data: {orderId: id, status: order.status, comment: `Customer asked to cancel: "${why}"`, updatedById: userId}});
                await notify(tx, userId, {
                    type: 'ORDER',
                    title: 'Cancellation requested',
                    body: `We have your request to cancel order ${order.orderNumber}. Once approved, the refund goes back to your original payment method.`,
                    link: `/account/orders/${id}`,
                });
            });
            return {...(await this.get(userId, id)), message: 'Cancellation requested. The shop will confirm it and refund you.'};
        }

        await prisma.$transaction(async (tx) => {
            const {count} = await tx.order.updateMany({
                where: {id, status: {in: [OrderStatus.PENDING, OrderStatus.CONFIRMED]}},
                data: {status: OrderStatus.CANCELLED, cancelReason: why, cancelRequested: true, cancelRequestedAt: new Date(), cancelApproved: true},
            });
            if (!count) throw new ApiError(httpStatus.CONFLICT, 'The order changed meanwhile. Please refresh.');
            await inventoryService.applyStockChanges(tx, {
                branchId: order.branchId,
                changes: order.items.map((i) => ({variantId: i.variantId, productId: i.productId, delta: i.quantity, type: MovementType.RETURN_RESTOCK})),
                reason: `Order ${order.orderNumber} cancelled by customer`,
                reference: order.orderNumber,
                sourceType: StockSourceType.ORDER,
                sourceId: order.id,
                performedById: userId,
            });
            await tx.orderStatusHistory.create({data: {orderId: id, status: OrderStatus.CANCELLED, comment: `Cancelled by customer: "${why}"`, updatedById: userId}});
            await notify(tx, userId, {type: 'ORDER', title: 'Order cancelled', body: `Your order ${order.orderNumber} is cancelled.`, link: `/account/orders/${id}`});
        });
        return {...(await this.get(userId, id)), message: 'Order cancelled'};
    }

    public async requestReturn(userId: string, id: string, data: z.infer<typeof returnSchema>) {
        const order = shape(await this.load(userId, id));
        if (order.status !== OrderStatus.DELIVERED) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'You can return items once the order is delivered');
        }
        const seen = new Set<string>();
        let refund = 0;
        for (const line of data.items) {
            if (seen.has(line.orderItemId)) throw new ApiError(httpStatus.BAD_REQUEST, 'An item is listed twice');
            seen.add(line.orderItemId);
            const item = order.items.find((i) => i.id === line.orderItemId);
            if (!item) throw new ApiError(httpStatus.BAD_REQUEST, 'That item is not in this order');
            if (item.returnableQty < line.quantity) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST,
                    item.returnableQty > 0
                        ? `Only ${item.returnableQty} of ${item.name} can be returned`
                        : item.returnedQty >= item.quantity
                        ? `${item.name} is already in a return request`
                        : item.returnUntil && item.returnUntil.getTime() < Date.now()
                        ? `${item.name} can no longer be returned (the window closed on ${item.returnUntil.toLocaleDateString('en-IN')})`
                        : `${item.name} cannot be returned`,
                );
            }
            refund += item.refundPerUnit * line.quantity;
        }
        const full = await prisma.order.findUniqueOrThrow({where: {id}, select: {companyId: true, shopId: true}});
        const created = await prisma.$transaction(async (tx) => {
            const r = await tx.returnRequest.create({
                data: {
                    orderId: id,
                    customerId: userId,
                    companyId: full.companyId,
                    shopId: full.shopId,
                    reason: data.reason,
                    description: data.details,
                    resolution: data.resolution,
                    exchangeFor: data.resolution === 'EXCHANGE' ? data.exchangeFor : null,
                    images: data.images,
                    refundAmount: data.resolution === 'REFUND' ? round2(refund) : 0,
                    returnStatus: ReturnStatus.REQUESTED,
                    returnItems: data.items as unknown as Prisma.InputJsonValue,
                },
            });
            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: OrderStatus.DELIVERED,
                    comment: `${data.resolution === 'EXCHANGE' ? 'Exchange' : 'Return'} requested: ${data.reason}`,
                    updatedById: userId,
                },
            });
            await notify(tx, userId, {
                type: 'RETURN',
                title: data.resolution === 'EXCHANGE' ? 'Exchange requested' : 'Return requested',
                body: `We have your request for order ${order.orderNumber}. The shop will review it within 24 hours.`,
                link: '/account/returns',
            });
            return r;
        });
        return {id: created.id, refundAmount: created.refundAmount, resolution: created.resolution};
    }

    /** Every return the customer has asked for, newest first */
    public async returns(userId: string) {
        const orders = await prisma.order.findMany({
            where: {customerId: userId, returns: {some: {}}},
            include: ORDER_INCLUDE,
            orderBy: {createdAt: 'desc'},
        });
        return orders
            .flatMap((o) => {
                const s = shape(o);
                return s.returns.map((r) => ({...r, order: {id: s.id, orderNumber: s.orderNumber, paymentMethod: s.paymentMethod, createdAt: s.createdAt}}));
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /** Put the items of an old order back in the bag (skips what is gone or sold out) */
    public async buyAgain(userId: string, id: string) {
        const order = await this.load(userId, id);
        const added: string[] = [];
        const skipped: string[] = [];
        for (const item of order.items) {
            const name = item.productName ?? item.product.name;
            try {
                await customerService.addToCart(userId, {variantId: item.variantId, quantity: item.quantity});
                added.push(name);
            } catch {
                skipped.push(name);
            }
        }
        return {added, skipped};
    }
}

export default new StoreOrderService();
