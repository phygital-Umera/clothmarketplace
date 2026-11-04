import {AccountStatus, BillStatus, Role} from '@prisma/client';
import prisma from '../client';

type BranchScope = {companyId: string; branchId: string};

const startOfDay = (d = new Date()) => {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s;
};

const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

const sum = (v?: number | null) => Math.round((v ?? 0) * 100) / 100;

/**
 * Branch admin dashboard: sales, purchases and stock across every shop of the branch.
 * Only confirmed bills count towards money figures.
 */
class BranchOverviewService {
    public async get(scope: BranchScope) {
        const {companyId, branchId} = scope;
        const now = new Date();
        const today = startOfDay(now);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const month = startOfMonth(now);

        const sales = {companyId, branchId, deletedAt: null, status: BillStatus.CONFIRMED};
        const purchases = {companyId, branchId, deletedAt: null, status: BillStatus.CONFIRMED};

        const [
            shops,
            todayByShopPay,
            monthByShop,
            yesterdayTotal,
            monthSales,
            monthPurchases,
            topCustomers,
            topSuppliers,
            draftSales,
            draftPurchases,
            inventory,
            staff,
            activeStaff,
        ] = await Promise.all([
            prisma.shop.findMany({
                where: {companyId, branchId, deletedAt: null},
                select: {
                    id: true,
                    name: true,
                    code: true,
                    status: true,
                    users: {
                        where: {role: Role.SHOP_ADMIN, deletedAt: null},
                        select: {fullname: true},
                        take: 1,
                    },
                },
                orderBy: {name: 'asc'},
            }),
            prisma.salesBill.groupBy({
                by: ['shopId', 'paymentMethod'],
                where: {...sales, billDate: {gte: today}},
                _sum: {totalAmount: true},
                _count: {_all: true},
            }),
            prisma.salesBill.groupBy({
                by: ['shopId'],
                where: {...sales, billDate: {gte: month}},
                _sum: {totalAmount: true},
            }),
            prisma.salesBill.aggregate({
                where: {...sales, billDate: {gte: yesterday, lt: today}},
                _sum: {totalAmount: true},
            }),
            prisma.salesBill.aggregate({
                where: {...sales, billDate: {gte: month}},
                _sum: {totalAmount: true, taxAmount: true},
                _count: {_all: true},
            }),
            prisma.purchaseBill.aggregate({
                where: {...purchases, billDate: {gte: month}},
                _sum: {totalAmount: true, taxAmount: true},
                _count: {_all: true},
            }),
            prisma.salesBill.groupBy({
                by: ['customerName'],
                where: {...sales, billDate: {gte: month}, customerName: {not: null}},
                _sum: {totalAmount: true},
                _count: {_all: true},
                orderBy: {_sum: {totalAmount: 'desc'}},
                take: 4,
            }),
            prisma.purchaseBill.groupBy({
                by: ['supplierName'],
                where: {...purchases, billDate: {gte: month}},
                _sum: {totalAmount: true},
                _count: {_all: true},
                orderBy: {_sum: {totalAmount: 'desc'}},
                take: 4,
            }),
            prisma.salesBill.findMany({
                where: {companyId, branchId, deletedAt: null, status: BillStatus.DRAFT},
                select: {
                    id: true,
                    billNumber: true,
                    totalAmount: true,
                    customerName: true,
                    billDate: true,
                    shop: {select: {name: true}},
                    createdBy: {select: {fullname: true}},
                },
                orderBy: {createdAt: 'desc'},
                take: 5,
            }),
            prisma.purchaseBill.findMany({
                where: {companyId, branchId, deletedAt: null, status: BillStatus.DRAFT},
                select: {
                    id: true,
                    billNumber: true,
                    totalAmount: true,
                    supplierName: true,
                    billDate: true,
                    shop: {select: {name: true}},
                    createdBy: {select: {fullname: true}},
                },
                orderBy: {createdAt: 'desc'},
                take: 5,
            }),
            prisma.inventory.findMany({
                where: {branchId},
                select: {
                    physicalQty: true,
                    threshold: true,
                    variant: {
                        select: {sellingPrice: true, product: {select: {sellingPrice: true}}},
                    },
                },
            }),
            prisma.user.count({
                where: {
                    companyId,
                    branchId,
                    deletedAt: null,
                    role: {in: [Role.EMPLOYEE, Role.SHOP_ADMIN]},
                },
            }),
            prisma.user.count({
                where: {
                    companyId,
                    branchId,
                    deletedAt: null,
                    role: {in: [Role.EMPLOYEE, Role.SHOP_ADMIN]},
                    status: AccountStatus.ACTIVE,
                },
            }),
        ]);

        const shopRows = shops.map((shop) => {
            const rows = todayByShopPay.filter((r) => r.shopId === shop.id);
            const amount = (pay?: string) =>
                sum(
                    rows
                        .filter((r) => (pay ? r.paymentMethod === pay : r.paymentMethod !== 'CASH'))
                        .reduce((t, r) => t + (r._sum.totalAmount ?? 0), 0),
                );
            return {
                id: shop.id,
                name: shop.name,
                code: shop.code,
                status: shop.status,
                manager: shop.users[0]?.fullname ?? null,
                bills: rows.reduce((t, r) => t + r._count._all, 0),
                sales: sum(rows.reduce((t, r) => t + (r._sum.totalAmount ?? 0), 0)),
                cash: amount('CASH'),
                digital: amount(),
                monthSales: sum(monthByShop.find((m) => m.shopId === shop.id)?._sum.totalAmount),
            };
        });

        const todaySales = sum(shopRows.reduce((t, s) => t + s.sales, 0));
        const prevSales = sum(yesterdayTotal._sum.totalAmount);
        const stockUnits = inventory.reduce((t, i) => t + Math.max(i.physicalQty, 0), 0);
        const stockValue = sum(
            inventory.reduce(
                (t, i) =>
                    t +
                    Math.max(i.physicalQty, 0) *
                        (i.variant.sellingPrice ?? i.variant.product.sellingPrice ?? 0),
                0,
            ),
        );
        const outputTax = sum(monthSales._sum.taxAmount);
        const inputTax = sum(monthPurchases._sum.taxAmount);

        return {
            today: {
                sales: todaySales,
                bills: shopRows.reduce((t, s) => t + s.bills, 0),
                cash: sum(shopRows.reduce((t, s) => t + s.cash, 0)),
                digital: sum(shopRows.reduce((t, s) => t + s.digital, 0)),
                /** Change against yesterday, in percent; null when yesterday had no sales */
                changePct: prevSales
                    ? Math.round(((todaySales - prevSales) / prevSales) * 100)
                    : null,
            },
            month: {
                sales: sum(monthSales._sum.totalAmount),
                salesBills: monthSales._count._all,
                purchases: sum(monthPurchases._sum.totalAmount),
                purchaseBills: monthPurchases._count._all,
                outputTax,
                inputTax,
                netTax: sum(outputTax - inputTax),
            },
            stock: {
                units: stockUnits,
                value: stockValue,
                lowStock: inventory.filter((i) => i.physicalQty <= i.threshold).length,
            },
            shops: {
                total: shops.length,
                active: shops.filter((s) => s.status === 'ACTIVE').length,
                rows: shopRows,
            },
            staff: {total: staff, active: activeStaff},
            pending: {
                count: draftSales.length + draftPurchases.length,
                sales: draftSales,
                purchases: draftPurchases,
            },
            topCustomers: topCustomers.map((c) => ({
                name: c.customerName,
                bills: c._count._all,
                amount: sum(c._sum.totalAmount),
            })),
            topSuppliers: topSuppliers.map((s) => ({
                name: s.supplierName,
                bills: s._count._all,
                amount: sum(s._sum.totalAmount),
            })),
        };
    }
}

export default new BranchOverviewService();
