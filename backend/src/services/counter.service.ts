import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import billService from './bill.service';
import {ShopScope} from './shopProduct.service';

/** The shop's cash counter: one open session (opening cash) at a time */
class CounterService {
    public current = (scope: ShopScope) =>
        prisma.counterSession.findFirst({
            where: {shopId: scope.shopId, closedAt: null},
            orderBy: {openedAt: 'desc'},
        });

    public open = async (scope: ShopScope, actorId: string, openingCash: number) => {
        const shop = await billService.shopContext(scope);
        return prisma.$transaction(async (tx) => {
            // Serialise opens for this shop so two clicks can't open two sessions
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'counter:' + shop.id}))`;
            const open = await tx.counterSession.findFirst({
                where: {shopId: shop.id, closedAt: null},
            });
            if (open) throw new ApiError(httpStatus.CONFLICT, 'The counter is already open');
            return tx.counterSession.create({
                data: {shopId: shop.id, openingCash, openedById: actorId},
            });
        });
    };

    public close = async (scope: ShopScope, actorId: string, closingCash: number) => {
        const open = await this.current(scope);
        if (!open) throw new ApiError(httpStatus.BAD_REQUEST, 'The counter is not open');
        const {count} = await prisma.counterSession.updateMany({
            where: {id: open.id, closedAt: null},
            data: {closedAt: new Date(), closingCash, closedById: actorId},
        });
        if (!count) throw new ApiError(httpStatus.CONFLICT, 'The counter was already closed');
        return prisma.counterSession.findUniqueOrThrow({where: {id: open.id}});
    };
}

export default new CounterService();
