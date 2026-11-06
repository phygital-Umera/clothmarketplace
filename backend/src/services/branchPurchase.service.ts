import httpStatus from 'http-status';
import {BillStatus, Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {BranchScope} from './customerDue.service';

/*
 * Purchase bills of every shop in the branch, read from the real PurchaseBill
 * rows. Shops make purchase bills (they put stock into a shop); the branch
 * admin sees and follows them up here.
 */

export const branchPurchaseQuerySchema = z.object({
    search: z.string().trim().max(100).optional(),
    tab: z.enum(['ALL', 'UNPAID', 'DRAFT']).default('ALL'),
    supplierName: z.string().trim().max(120).optional(),
    shopId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
    // YYYY-MM
    month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a valid month')
        .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(15),
});
type Query = z.infer<typeof branchPurchaseQuerySchema>;

const round2 = (v: number) => Math.round(v * 100) / 100;

const monthRange = (month?: string) => {
    const [y, m] = (month ?? new Date().toISOString().slice(0, 7)).split('-').map(Number);
    return {gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1)};
};

const BILL_INCLUDE = {
    shop: {select: {id: true, name: true}},
    createdBy: {select: {fullname: true}},
    items: {
        select: {
            product: {select: {name: true}},
            variant: {select: {variantSku: true, size: true, color: true}},
            quantity: true,
            unitCost: true,
            taxRate: true,
            totalCost: true,
        },
    },
} satisfies Prisma.PurchaseBillInclude;

type Bill = Prisma.PurchaseBillGetPayload<{include: typeof BILL_INCLUDE}>;

const statusOf = (b: Bill) => {
    if (b.status === BillStatus.DRAFT) return 'DRAFT';
    if (b.status === BillStatus.CANCELLED) return 'CANCELLED';
    if (b.balanceDue <= 0) return 'PAID';
    if (b.dueDate && b.dueDate.getTime() < Date.now()) return 'OVERDUE';
    return b.amountPaid > 0 ? 'PARTIAL' : 'UNPAID';
};

const toRow = (b: Bill) => ({
    id: b.id,
    billNumber: b.billNumber,
    billDate: b.billDate,
    supplierName: b.supplierName,
    supplierInvoiceNo: b.supplierInvoiceNo ?? '',
    boughtBy: b.createdBy?.fullname ?? '—',
    stockTo: b.shop.name,
    pcs: b.items.reduce((t, i) => t + i.quantity, 0),
    taxable: round2(b.subtotal),
    gstAmount: b.taxAmount,
    totalAmount: b.totalAmount,
    paidAmount: b.amountPaid,
    balanceAmount: b.balanceDue,
    dueDate: b.dueDate,
    status: statusOf(b),
    items: b.items.map((i) => ({
        productName: i.product.name,
        sku: i.variant.variantSku,
        size: i.variant.size,
        color: i.variant.color,
        pcs: i.quantity,
        cost: i.unitCost,
        gstRate: i.taxRate,
        total: i.totalCost,
    })),
});

class BranchPurchaseService {
    private base(scope: BranchScope): Prisma.PurchaseBillWhereInput {
        return {companyId: scope.companyId, branchId: scope.branchId, deletedAt: null};
    }

    public async list(scope: BranchScope, query: Query) {
        const where: Prisma.PurchaseBillWhereInput = {
            ...this.base(scope),
            billDate: monthRange(query.month),
            ...(query.shopId ? {shopId: query.shopId} : {}),
            ...(query.supplierName
                ? {supplierName: {equals: query.supplierName, mode: 'insensitive'}}
                : {}),
            ...(query.tab === 'DRAFT' ? {status: BillStatus.DRAFT} : {}),
            ...(query.tab === 'UNPAID' ? {status: BillStatus.CONFIRMED, balanceDue: {gt: 0}} : {}),
            ...(query.search
                ? {
                      OR: [
                          {billNumber: {contains: query.search, mode: 'insensitive'}},
                          {supplierName: {contains: query.search, mode: 'insensitive'}},
                          {supplierInvoiceNo: {contains: query.search, mode: 'insensitive'}},
                      ],
                  }
                : {}),
        };
        const [rows, total] = await prisma.$transaction([
            prisma.purchaseBill.findMany({
                where,
                include: BILL_INCLUDE,
                orderBy: {billDate: 'desc'},
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            prisma.purchaseBill.count({where}),
        ]);
        return {
            items: rows.map(toRow),
            pagination: {total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) || 1},
        };
    }

    public async summary(scope: BranchScope, month?: string) {
        const confirmed = {...this.base(scope), status: BillStatus.CONFIRMED};
        const [monthAgg, pcs, open, overdue, suppliers, shops] = await Promise.all([
            prisma.purchaseBill.aggregate({
                where: {...confirmed, billDate: monthRange(month)},
                _sum: {totalAmount: true, taxAmount: true},
                _count: true,
            }),
            prisma.purchaseBillItem.aggregate({
                where: {bill: {...confirmed, billDate: monthRange(month)}},
                _sum: {quantity: true},
            }),
            prisma.purchaseBill.aggregate({where: {...confirmed, balanceDue: {gt: 0}}, _sum: {balanceDue: true}}),
            prisma.purchaseBill.count({where: {...confirmed, balanceDue: {gt: 0}, dueDate: {lt: new Date()}}}),
            prisma.purchaseBill.findMany({
                where: this.base(scope),
                distinct: ['supplierName'],
                select: {supplierName: true},
                orderBy: {supplierName: 'asc'},
            }),
            prisma.shop.findMany({
                where: {branchId: scope.branchId, deletedAt: null},
                select: {id: true, name: true},
                orderBy: {name: 'asc'},
            }),
        ]);
        return {
            purchasesMonth: monthAgg._sum.totalAmount ?? 0,
            billsCount: monthAgg._count,
            pcsCount: pcs._sum.quantity ?? 0,
            inputGst: round2(monthAgg._sum.taxAmount ?? 0),
            payable: round2(open._sum.balanceDue ?? 0),
            overdueCount: overdue,
            suppliers: suppliers.map((s) => s.supplierName),
            shops,
        };
    }

    public async get(scope: BranchScope, id: string) {
        const bill = await prisma.purchaseBill.findFirst({where: {id, ...this.base(scope)}, include: BILL_INCLUDE});
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase bill not found');
        return toRow(bill);
    }
}

export default new BranchPurchaseService();
