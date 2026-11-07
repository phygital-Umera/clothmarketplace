import {Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {shopOpsValidation} from '@validations/index';
import billService from './bill.service';
import {ShopScope} from './shopProduct.service';

type CreateExpense = z.infer<typeof shopOpsValidation.createExpenseSchema>;
type ExpenseList = z.infer<typeof shopOpsValidation.expenseListSchema>;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDayMonth(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()] || '';
    return `${day} ${month}`;
}

/** Indian financial year of a date, as used in expense numbers: April 2026 – March 2027 → "26-27" */
const financialYear = (d = new Date()) => {
    const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${String(start % 100).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`;
};

/** Shop running expenses; cash ones come out of the counter drawer */
class ExpenseService {
    public getNextExpenseNumber = async (scope: ShopScope): Promise<string> => {
        const shop = await billService.shopContext(scope);
        // Numbers run per shop and restart each financial year: EX/26-27/0001, 0002, …
        const prefix = `EX/${financialYear()}/`;
        const lastExpense = await prisma.expense.findFirst({
            where: {
                shopId: shop.id,
                expenseNumber: { startsWith: prefix },
            },
            orderBy: { createdAt: 'desc' },
        });

        let nextSeq = 1;
        if (lastExpense?.expenseNumber) {
            const parts = lastExpense.expenseNumber.split('/');
            const numPart = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(numPart)) {
                nextSeq = numPart + 1;
            }
        }

        return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    };

    public create = async (scope: ShopScope, actorId: string, data: CreateExpense) => {
        const shop = await billService.shopContext(scope);
        const expenseNumber = await this.getNextExpenseNumber(scope);

        const expenseDate = data.date ? new Date(data.date) : data.expenseDate ?? new Date();
        const amt = Number(data.amount);
        const head = data.head || data.category || 'Other';
        const description = data.description || data.notes || '';
        const paidBy = data.paidBy || 'Cash from counter';
        const isCash = paidBy.toLowerCase().includes('cash');
        const mode = isCash ? 'CASH' : paidBy.toLowerCase().includes('upi') ? 'UPI' : 'BANK';
        const gstAmount = Number(data.gstAmount || 0);

        const created = await prisma.$transaction(async (tx) => {
            const exp = await tx.expense.create({
                data: {
                    expenseNumber,
                    companyId: shop.companyId,
                    branchId: shop.branchId,
                    shopId: shop.id,
                    head,
                    description,
                    category: head.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
                    amount: amt,
                    mode,
                    paidBy,
                    gstAmount,
                    photoUrl: data.photoUrl || null,
                    notes: description,
                    expenseDate,
                    createdById: actorId,
                },
                include: {createdBy: {select: {id: true, fullname: true}}},
            });

            // Cash expenses reduce the drawer balance in the cash book
            if (isCash) {
                await tx.cashEntry.create({
                    data: {
                        shopId: shop.id,
                        type: 'OUT',
                        amount: amt,
                        particulars: `Expense: ${description || head}`,
                        reference: expenseNumber,
                        createdById: actorId,
                    },
                });
            }

            return exp;
        });

        return created;
    };

    public list = async (scope: ShopScope, query: ExpenseList) => {
        const shop = await billService.shopContext(scope);
        const now = new Date();
        const targetMonth = query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const [yearStr, monthStr] = targetMonth.split('-');
        const year = parseInt(yearStr, 10) || now.getFullYear();
        const monthNum = parseInt(monthStr, 10) || now.getMonth() + 1;

        const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

        // "Today" is the real today
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Fetch all expenses in the month for metrics calculation
        const allMonthExpenses = await prisma.expense.findMany({
            where: {
                shopId: shop.id,
                expenseDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            include: {createdBy: {select: {id: true, fullname: true}}},
            orderBy: {expenseDate: 'desc'},
        });

        const thisMonthTotal = allMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const cashExpenses = allMonthExpenses.filter(
            (e) => e.mode === 'CASH' || (e.paidBy && e.paidBy.toLowerCase().includes('cash')),
        );
        const paidInCashTotal = cashExpenses.reduce((sum, e) => sum + e.amount, 0);
        const cashEntriesCount = cashExpenses.length;

        const todayExpenses = allMonthExpenses.filter((e) => {
            const d = new Date(e.expenseDate);
            return d >= startOfToday && d <= endOfToday;
        });
        const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const todayEntriesCount = todayExpenses.length;

        const metrics = {
            thisMonth: thisMonthTotal,
            thisMonthSub: 'Rent, salary, electricity...',
            paidInCash: paidInCashTotal,
            cashEntriesCount,
            cashEntriesSub: `${cashEntriesCount} entries from counter`,
            today: todayTotal,
            todayEntriesCount,
            todayEntriesSub: `${todayEntriesCount} entries`,
        };

        // Filter for the list table
        let filteredExpenses = allMonthExpenses;
        if (query.head && query.head !== 'All heads' && query.head !== 'ALL') {
            const normHead = query.head.trim().toLowerCase();
            filteredExpenses = filteredExpenses.filter(
                (e) => (e.head && e.head.toLowerCase().includes(normHead)) ||
                       (e.category && e.category.toLowerCase().includes(normHead)),
            );
        }

        const nextExpenseNumber = await this.getNextExpenseNumber(scope);

        const formattedList = filteredExpenses.map((e) => ({
            id: e.id,
            expenseNumber: e.expenseNumber || `EX/${financialYear(e.expenseDate)}/${e.id.slice(0, 4).toUpperCase()}`,
            date: formatDayMonth(new Date(e.expenseDate)),
            rawDate: e.expenseDate.toISOString(),
            head: e.head || e.category,
            description: e.description || e.notes || 'Expense',
            loggedBy: e.createdBy?.fullname || 'Staff',
            paidBy: e.paidBy || (e.mode === 'CASH' ? 'Cash' : e.mode),
            amount: e.amount,
            gstAmount: e.gstAmount || 0,
            photoUrl: e.photoUrl,
        }));

        return {
            metrics,
            nextExpenseNumber,
            expenses: formattedList,
            total: formattedList.length,
        };
    };
}

export default new ExpenseService();
