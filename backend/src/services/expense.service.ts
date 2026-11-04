import {Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {listArgs, toListResult} from '../utils/list';
import {shopOpsValidation} from '@validations/index';
import billService from './bill.service';
import {ShopScope} from './shopProduct.service';

type CreateExpense = z.infer<typeof shopOpsValidation.createExpenseSchema>;
type ExpenseList = z.infer<typeof shopOpsValidation.expenseListSchema>;

/** Shop running expenses; cash ones come out of the counter drawer */
class ExpenseService {
    public create = async (scope: ShopScope, actorId: string, data: CreateExpense) => {
        const shop = await billService.shopContext(scope);
        return prisma.expense.create({
            data: {
                ...data,
                expenseDate: data.expenseDate ?? new Date(),
                companyId: shop.companyId,
                branchId: shop.branchId,
                shopId: shop.id,
                createdById: actorId,
            },
            include: {createdBy: {select: {id: true, fullname: true}}},
        });
    };

    public list = async (scope: ShopScope, query: ExpenseList) => {
        const to = query.to ? new Date(query.to) : undefined;
        to?.setHours(23, 59, 59, 999);
        const where: Prisma.ExpenseWhereInput = {
            shopId: scope.shopId,
            ...(query.from || to
                ? {
                      expenseDate: {
                          ...(query.from ? {gte: query.from} : {}),
                          ...(to ? {lte: to} : {}),
                      },
                  }
                : {}),
            ...(query.search
                ? {
                      OR: [
                          {category: {contains: query.search, mode: 'insensitive'}},
                          {notes: {contains: query.search, mode: 'insensitive'}},
                      ],
                  }
                : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.expense.findMany({
                where,
                ...listArgs(query),
                include: {createdBy: {select: {id: true, fullname: true}}},
            }),
            prisma.expense.count({where}),
        ]);
        return toListResult(items, total, query);
    };
}

export default new ExpenseService();
