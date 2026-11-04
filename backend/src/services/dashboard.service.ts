import {AccountStatus, BillStatus, Prisma, Role} from '@prisma/client';
import prisma from '../client';
import billService from './bill.service';
import counterService from './counter.service';
import inventoryService from './inventory.service';
import {ShopScope} from './shopProduct.service';

const round2 = (v: number) => Math.round(v * 100) / 100;
const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s;
};

/** Party key for grouping dues: phone when known, else the name */
const partyKey = (name?: string | null, phone?: string | null) =>
    (phone?.trim() || name?.trim().toLowerCase() || 'unknown').toString();

const MODE_LABEL: Record<string, string> = {
    CASH: 'Cash',
    UPI: 'UPI',
    CARD: 'Card',
    STORE_CREDIT: 'Store credit',
    ADJUST_DUE: 'Adjusted in due',
};

/*
 * Shop admin dashboard. Every figure is read from the database: confirmed,
 * non-deleted bills of the signed-in user's shop; payments of cancelled
 * bills are ignored. "Today" is the server's local day.
 */
class DashboardService {
    /** Weighted-average purchase cost (ex-tax) per variant from confirmed purchases */
    private async averageCosts(shopId: string) {
        const rows = await prisma.$queryRaw<Array<{variantId: string; cost: number}>>`
            SELECT i."variantId", SUM(i."quantity" * i."unitCost") / NULLIF(SUM(i."quantity"), 0) AS cost
            FROM "PurchaseBillItem" i
            JOIN "PurchaseBill" b ON b."id" = i."billId"
            WHERE b."shopId" = ${shopId} AND b."status" = 'CONFIRMED' AND b."deletedAt" IS NULL
            GROUP BY i."variantId"`;
        return new Map(rows.map((r) => [r.variantId, Number(r.cost) || 0]));
    }

    public getShopDashboard = async (scope: ShopScope) => {
        const shop = await billService.shopContext(scope);
        const now = new Date();
        const today = startOfDay(now);
        const lastWeekDay = new Date(today.getTime() - 7 * DAY);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const confirmedSales: Prisma.SalesBillWhereInput = {
            shopId: shop.id,
            deletedAt: null,
            status: BillStatus.CONFIRMED,
        };
        const confirmedPurchase: Prisma.PurchaseBillWhereInput = {
            shopId: shop.id,
            deletedAt: null,
            status: BillStatus.CONFIRMED,
        };
        const salesBetween = (gte: Date, lt?: Date) =>
            prisma.salesBill.aggregate({
                where: {...confirmedSales, billDate: {gte, ...(lt ? {lt} : {})}},
                _sum: {totalAmount: true},
            });
        const returnsBetween = (gte: Date, lt?: Date) =>
            prisma.salesReturn.aggregate({
                where: {shopId: shop.id, returnDate: {gte, ...(lt ? {lt} : {})}},
                _sum: {totalAmount: true},
            });

        const [
            shopInfo,
            session,
            todayBills,
            todayReturns,
            lastWeekSales,
            lastWeekReturns,
            monthSales,
            monthReturns,
            todayPayments,
            customerDueBills,
            supplierDueBills,
            stockRows,
            avgCost,
            stock,
            staffTotal,
            staffIn,
        ] = await Promise.all([
            prisma.shop.findUniqueOrThrow({
                where: {id: shop.id},
                select: {name: true, code: true, gstin: true, branch: {select: {name: true}}},
            }),
            counterService.current(scope),
            prisma.salesBill.findMany({
                where: {...confirmedSales, billDate: {gte: today}},
                orderBy: {createdAt: 'desc'},
                select: {
                    id: true,
                    billNumber: true,
                    createdAt: true,
                    customerName: true,
                    totalAmount: true,
                    taxAmount: true,
                    balanceDue: true,
                    paymentStatus: true,
                    payments: {select: {mode: true}},
                    items: {select: {variantId: true, quantity: true}},
                },
            }),
            prisma.salesReturn.findMany({
                where: {shopId: shop.id, returnDate: {gte: today}},
                orderBy: {createdAt: 'desc'},
                select: {
                    id: true,
                    returnNumber: true,
                    createdAt: true,
                    customerName: true,
                    totalAmount: true,
                    refundMode: true,
                    salesBillId: true,
                    items: {
                        select: {
                            variantId: true,
                            quantity: true,
                            totalPrice: true,
                            salesBillItem: {select: {taxRate: true}},
                        },
                    },
                },
            }),
            salesBetween(lastWeekDay, new Date(lastWeekDay.getTime() + DAY)),
            returnsBetween(lastWeekDay, new Date(lastWeekDay.getTime() + DAY)),
            salesBetween(monthStart),
            returnsBetween(monthStart),
            prisma.salesBillPayment.groupBy({
                by: ['mode'],
                where: {paidAt: {gte: today}, bill: confirmedSales},
                _sum: {amount: true},
            }),
            prisma.salesBill.findMany({
                where: {...confirmedSales, balanceDue: {gt: 0}},
                orderBy: {billDate: 'asc'},
                select: {
                    id: true,
                    billNumber: true,
                    billDate: true,
                    dueDate: true,
                    customerName: true,
                    customerPhone: true,
                    balanceDue: true,
                    payments: {
                        where: {atBilling: false},
                        orderBy: {paidAt: 'desc'},
                        take: 1,
                        select: {paidAt: true, amount: true},
                    },
                },
            }),
            prisma.purchaseBill.findMany({
                where: {...confirmedPurchase, balanceDue: {gt: 0}},
                orderBy: {billDate: 'asc'},
                select: {
                    id: true,
                    billNumber: true,
                    billDate: true,
                    dueDate: true,
                    supplierName: true,
                    supplierPhone: true,
                    balanceDue: true,
                },
            }),
            prisma.inventory.findMany({
                where: {
                    branchId: shop.branchId,
                    variant: {product: {shopId: shop.id, deletedAt: null}},
                },
                select: {variantId: true, physicalQty: true},
            }),
            this.averageCosts(shop.id),
            inventoryService.getDashboard(
                {companyId: shop.companyId, branchId: shop.branchId, shopId: shop.id},
                {},
            ),
            prisma.user.count({
                where: {
                    shopId: shop.id,
                    deletedAt: null,
                    status: AccountStatus.ACTIVE,
                    role: {in: [Role.SHOP_ADMIN, Role.EMPLOYEE]},
                },
            }),
            prisma.user.count({
                where: {
                    shopId: shop.id,
                    deletedAt: null,
                    status: AccountStatus.ACTIVE,
                    role: {in: [Role.SHOP_ADMIN, Role.EMPLOYEE]},
                    lastLoginAt: {gte: today},
                },
            }),
        ]);

        // ---- Sales today, net of returns, vs the same weekday last week ----
        const grossToday = todayBills.reduce((s, b) => s + b.totalAmount, 0);
        const returnsToday = todayReturns.reduce((s, r) => s + r.totalAmount, 0);
        const salesToday = round2(grossToday - returnsToday);
        const salesLastWeek = round2(
            (lastWeekSales._sum.totalAmount ?? 0) - (lastWeekReturns._sum.totalAmount ?? 0),
        );
        const changePct =
            salesLastWeek > 0 ? round2(((salesToday - salesLastWeek) / salesLastWeek) * 100) : null;

        // ---- Gross profit today: net sales ex-tax minus average cost of goods ----
        const costOf = (variantId: string) => avgCost.get(variantId);
        let costMissingItems = 0;
        let cogs = 0;
        for (const b of todayBills) {
            for (const i of b.items) {
                const c = costOf(i.variantId);
                if (c === undefined) costMissingItems++;
                cogs += (c ?? 0) * i.quantity;
            }
        }
        let returnsExTax = 0;
        for (const r of todayReturns) {
            for (const i of r.items) {
                cogs -= (costOf(i.variantId) ?? 0) * i.quantity;
                returnsExTax += i.totalPrice / (1 + (i.salesBillItem.taxRate ?? 0) / 100);
            }
        }
        const netSalesExTax =
            todayBills.reduce((s, b) => s + b.totalAmount - b.taxAmount, 0) - returnsExTax;
        const grossProfit = round2(netSalesExTax - cogs);
        const marginPct = netSalesExTax > 0 ? round2((grossProfit / netSalesExTax) * 100) : null;

        // ---- Cash in drawer since the counter was opened ----
        let cash = null as null | {
            inDrawer: number;
            openingCash: number;
            cashSales: number;
            cashRefunds: number;
            cashExpenses: number;
            supplierPayments: number;
        };
        if (session) {
            const since = session.openedAt;
            const [cashIn, refunds, expenses, supplierCash] = await Promise.all([
                prisma.salesBillPayment.aggregate({
                    where: {mode: 'CASH', paidAt: {gte: since}, bill: confirmedSales},
                    _sum: {amount: true},
                }),
                prisma.salesReturn.aggregate({
                    where: {shopId: shop.id, refundMode: 'CASH', createdAt: {gte: since}},
                    _sum: {totalAmount: true},
                }),
                prisma.expense.aggregate({
                    where: {shopId: shop.id, mode: 'CASH', createdAt: {gte: since}},
                    _sum: {amount: true},
                }),
                prisma.purchaseBillPayment.aggregate({
                    where: {mode: 'CASH', paidAt: {gte: since}, bill: confirmedPurchase},
                    _sum: {amount: true},
                }),
            ]);
            const cashSales = cashIn._sum.amount ?? 0;
            const cashRefunds = refunds._sum.totalAmount ?? 0;
            const cashExpenses = expenses._sum.amount ?? 0;
            const supplierPayments = supplierCash._sum.amount ?? 0;
            cash = {
                openingCash: session.openingCash,
                cashSales: round2(cashSales),
                cashRefunds: round2(cashRefunds),
                cashExpenses: round2(cashExpenses),
                supplierPayments: round2(supplierPayments),
                inDrawer: round2(
                    session.openingCash + cashSales - cashRefunds - cashExpenses - supplierPayments,
                ),
            };
        }

        // ---- Customer dues, grouped per customer ----
        const customers = new Map<
            string,
            {
                name: string;
                phone: string | null;
                outstanding: number;
                since: Date;
                dueDate: Date | null;
                lastPayment: {paidAt: Date; amount: number} | null;
                bills: Array<{id: string; billNumber: string; balanceDue: number}>;
            }
        >();
        for (const b of customerDueBills) {
            const key = partyKey(b.customerName, b.customerPhone);
            const c = customers.get(key) ?? {
                name: b.customerName || 'Walk-in',
                phone: b.customerPhone,
                outstanding: 0,
                since: b.billDate,
                dueDate: null,
                lastPayment: null,
                bills: [],
            };
            c.outstanding = round2(c.outstanding + b.balanceDue);
            if (b.dueDate && (!c.dueDate || b.dueDate < c.dueDate)) c.dueDate = b.dueDate;
            const paid = b.payments[0];
            if (paid && (!c.lastPayment || paid.paidAt > c.lastPayment.paidAt))
                c.lastPayment = paid;
            c.bills.push({id: b.id, billNumber: b.billNumber, balanceDue: b.balanceDue});
            customers.set(key, c);
        }
        const customerList = [...customers.values()];
        const overdueDays = (d: Date | null) =>
            d && d < today ? Math.floor((today.getTime() - startOfDay(d).getTime()) / DAY) : 0;

        // ---- Supplier payables, grouped per supplier ----
        const suppliers = new Map<
            string,
            {
                name: string;
                phone: string | null;
                outstanding: number;
                dueDate: Date | null;
                bills: Array<{id: string; billNumber: string; balanceDue: number}>;
            }
        >();
        let overdueSupplierBills = 0;
        for (const b of supplierDueBills) {
            const key = partyKey(b.supplierName, b.supplierPhone);
            const s = suppliers.get(key) ?? {
                name: b.supplierName,
                phone: b.supplierPhone,
                outstanding: 0,
                dueDate: null,
                bills: [],
            };
            s.outstanding = round2(s.outstanding + b.balanceDue);
            if (b.dueDate && (!s.dueDate || b.dueDate < s.dueDate)) s.dueDate = b.dueDate;
            if (b.dueDate && b.dueDate < today) overdueSupplierBills++;
            s.bills.push({id: b.id, billNumber: b.billNumber, balanceDue: b.balanceDue});
            suppliers.set(key, s);
        }

        // ---- Stock value at average cost ----
        let stockValue = 0;
        let stockPieces = 0;
        for (const row of stockRows) {
            if (row.physicalQty <= 0) continue;
            stockPieces += row.physicalQty;
            stockValue += row.physicalQty * (avgCost.get(row.variantId) ?? 0);
        }

        // ---- Today's bills & credit notes, newest first ----
        const register = [
            ...todayBills.map((b) => {
                const modes = [...new Set(b.payments.map((p) => MODE_LABEL[p.mode] ?? p.mode))];
                if (b.balanceDue > 0) modes.push('Credit');
                return {
                    kind: 'BILL' as const,
                    id: b.id,
                    number: b.billNumber,
                    at: b.createdAt,
                    customer: b.customerName || 'Walk-in',
                    paidBy: modes.length ? modes : ['Credit'],
                    amount: b.totalAmount,
                    status: b.paymentStatus as string,
                };
            }),
            ...todayReturns.map((r) => ({
                kind: 'RETURN' as const,
                id: r.id,
                number: r.returnNumber,
                at: r.createdAt,
                customer: r.customerName || 'Walk-in',
                paidBy: [MODE_LABEL[r.refundMode] ?? r.refundMode],
                amount: -r.totalAmount,
                status: 'RETURN',
                salesBillId: r.salesBillId,
            })),
        ].sort((a, b) => b.at.getTime() - a.at.getTime());

        // ---- Payment mix today (payments received today + credit given today) ----
        const mix = ['CASH', 'UPI', 'CARD'].map((mode) => ({
            mode,
            label: MODE_LABEL[mode],
            amount: round2(todayPayments.find((p) => p.mode === mode)?._sum.amount ?? 0),
        }));
        mix.push({
            mode: 'CREDIT',
            label: 'Credit',
            amount: round2(todayBills.reduce((s, b) => s + b.balanceDue, 0)),
        });

        return {
            generatedAt: now,
            shop: {
                name: shopInfo.name,
                code: shopInfo.code,
                gstin: shopInfo.gstin,
                branchName: shopInfo.branch.name,
            },
            counter: session
                ? {id: session.id, openedAt: session.openedAt, openingCash: session.openingCash}
                : null,
            staff: {in: staffIn, total: staffTotal},
            kpis: {
                salesToday,
                billsToday: todayBills.length,
                returnsToday: round2(returnsToday),
                salesLastWeekSameDay: salesLastWeek,
                changePct,
                cash,
                grossProfit,
                marginPct,
                costMissingItems,
                salesThisMonth: round2(
                    (monthSales._sum.totalAmount ?? 0) - (monthReturns._sum.totalAmount ?? 0),
                ),
                monthStart,
                customerDues: round2(customerList.reduce((s, c) => s + c.outstanding, 0)),
                customersWithDues: customerList.length,
                customersOverdue: customerList.filter((c) => overdueDays(c.dueDate) > 0).length,
                supplierPayable: round2(supplierDueBills.reduce((s, b) => s + b.balanceDue, 0)),
                supplierBillsOverdue: overdueSupplierBills,
                stockValue: round2(stockValue),
                stockPieces,
                lowStock: stock.summary.lowStockCount,
                outOfStock: stock.summary.outOfStockCount,
            },
            todaysBills: register,
            paymentMix: mix,
            duesToCollect: customerList
                .sort((a, b) => b.outstanding - a.outstanding)
                .slice(0, 5)
                .map((c) => ({...c, overdueDays: overdueDays(c.dueDate)})),
            lowStock: stock.alerts.slice(0, 8).map((a) => ({
                variantId: a.variantId,
                productName: a.productName,
                variantSku: a.variantSku,
                size: a.size,
                color: a.color,
                colorHex: a.colorHex,
                available: a.availableStock,
                threshold: a.threshold,
                status: a.status,
            })),
            supplierPayments: [...suppliers.values()]
                .sort((a, b) => b.outstanding - a.outstanding)
                .slice(0, 5)
                .map((s) => ({...s, overdueDays: overdueDays(s.dueDate)})),
        };
    };
}

export default new DashboardService();
