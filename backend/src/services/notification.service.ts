import {OrderStatus, Prisma} from '@prisma/client';
import prisma from '../client';

/**
 * Customer notifications shown on the store (bell + Notifications page).
 * Written inside the same transaction as the change they describe, so a
 * rolled-back change never leaves a message behind.
 */
type Db = Prisma.TransactionClient | typeof prisma;
export const NOTIFICATION_TYPES = ['ORDER', 'PAYMENT', 'RETURN', 'OFFER', 'ACCOUNT'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notify = (
    db: Db,
    userId: string,
    n: {type: NotificationType; title: string; body: string; link?: string},
) => db.notification.create({data: {userId, ...n}});

const ORDER_TEXT: Partial<Record<OrderStatus, (no: string) => {title: string; body: string}>> = {
    CONFIRMED: (no) => ({title: 'Order confirmed', body: `Your order ${no} is confirmed and will be packed soon.`}),
    PROCESSING: (no) => ({title: 'Order being prepared', body: `We are getting your order ${no} ready.`}),
    PACKED: (no) => ({title: 'Order packed', body: `Your order ${no} is packed and waiting for the courier.`}),
    READY_FOR_DISPATCH: (no) => ({title: 'Ready to ship', body: `Your order ${no} will be handed to the courier shortly.`}),
    DISPATCHED: (no) => ({title: 'Order shipped', body: `Your order ${no} has left our store.`}),
    SHIPPED: (no) => ({title: 'Order shipped', body: `Your order ${no} is on its way.`}),
    OUT_FOR_DELIVERY: (no) => ({title: 'Out for delivery today', body: `Your order ${no} will reach you today. Keep your phone handy.`}),
    DELIVERED: (no) => ({title: 'Delivered', body: `Your order ${no} was delivered. Tell us how you like it.`}),
    CANCELLED: (no) => ({title: 'Order cancelled', body: `Your order ${no} was cancelled.`}),
    RETURNED: (no) => ({title: 'Return completed', body: `The return for order ${no} is complete.`}),
};

/** Tell the customer their order moved to a new status (skips statuses with no message) */
export const notifyOrderStatus = (
    db: Db,
    order: {id: string; orderNumber: string; customerId: string},
    status: OrderStatus,
    extra?: string,
) => {
    const text = ORDER_TEXT[status]?.(order.orderNumber);
    if (!text) return Promise.resolve(null);
    return notify(db, order.customerId, {
        type: 'ORDER',
        title: text.title,
        body: extra ? `${text.body} ${extra}` : text.body,
        link: `/account/orders/${order.id}`,
    });
};

class NotificationService {
    public async list(userId: string, tab: 'all' | 'unread' | 'orders' | 'offers' | 'account', page = 1) {
        const take = 30;
        const where: Prisma.NotificationWhereInput = {
            userId,
            ...(tab === 'unread' ? {readAt: null} : {}),
            ...(tab === 'orders' ? {type: {in: ['ORDER', 'PAYMENT', 'RETURN']}} : {}),
            ...(tab === 'offers' ? {type: 'OFFER'} : {}),
            ...(tab === 'account' ? {type: 'ACCOUNT'} : {}),
        };
        const [items, total, unread] = await Promise.all([
            prisma.notification.findMany({where, orderBy: {createdAt: 'desc'}, skip: (page - 1) * take, take}),
            prisma.notification.count({where}),
            prisma.notification.count({where: {userId, readAt: null}}),
        ]);
        return {items, total, unread, page, pages: Math.max(1, Math.ceil(total / take))};
    }

    public unreadCount(userId: string) {
        return prisma.notification.count({where: {userId, readAt: null}}).then((unread) => ({unread}));
    }

    public async markRead(userId: string, id: string) {
        await prisma.notification.updateMany({where: {id, userId, readAt: null}, data: {readAt: new Date()}});
        return this.unreadCount(userId);
    }

    public async markAllRead(userId: string) {
        await prisma.notification.updateMany({where: {userId, readAt: null}, data: {readAt: new Date()}});
        return {unread: 0};
    }
}

export default new NotificationService();
