import {Request} from 'express';
import httpStatus from 'http-status';
import {BillStatus, Role} from '@prisma/client';
import {auditService, billService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {billValidation as v} from '@validations/index';
import {ShopScope} from '../services/shopProduct.service';
import {Kind} from '../services/bill.service';

/*
 * Shop purchase & sales bills. Stock is updated automatically by the
 * service; the shop scope is never taken from the request.
 */
const shopOf = (req: Request): ShopScope => {
    const {companyId, shopId} = req.user;
    if (!companyId || !shopId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    }
    return {companyId, shopId};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

/**
 * D-16: an employee deletes drafts only. Their delete of a posted bill asks
 * the shop admin or owner, who approves it by deleting the bill, or keeps it.
 */
const removeBill = (kind: Kind) => {
    const name = kind === 'PURCHASE' ? 'purchaseBill' : 'salesBill';
    const label = kind === 'PURCHASE' ? 'Purchase bill' : 'Sales bill';
    const remove = kind === 'PURCHASE' ? billService.deletePurchase : billService.deleteSales;
    return catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const employee = req.user.role === Role.EMPLOYEE;
        if (employee && (await billService.statusOf(kind, scope, id)) !== BillStatus.DRAFT) {
            const {reason} = v.deleteRequestSchema.parse(req.body ?? {});
            await auditService.track(
                req,
                {action: `${name}.deleteRequest`, module: 'billing', targetId: id, reason},
                async () => {
                    await billService.requestDelete(kind, scope, req.user.id, id, reason);
                    return {};
                },
            );
            return ok(
                res,
                {requested: true},
                'Sent to the shop admin to approve',
                httpStatus.ACCEPTED,
            );
        }
        await auditService.track(
            req,
            {action: `${name}.delete`, module: 'billing', targetId: id},
            async () => {
                // Employees: drafts only, even if the bill was confirmed meanwhile
                await remove(scope, req.user.id, id, employee);
                return {};
            },
        );
        return ok(res, {}, `${label} deleted`);
    });
};

/** The shop admin or owner keeps a bill an employee asked to delete */
const keepBill = (kind: Kind) =>
    catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const name = kind === 'PURCHASE' ? 'purchaseBill' : 'salesBill';
        await auditService.track(
            req,
            {action: `${name}.keep`, module: 'billing', targetId: id},
            async () => {
                await billService.keepBill(kind, scope, id);
                return {};
            },
        );
        return ok(res, {}, 'Bill kept; the delete request is turned down');
    });

const purchase = {
    findByNumber: catchAsync(async (req, res) => {
        const billNumber = String(req.query.billNumber || req.params.billNumber || '');
        if (!billNumber.trim()) throw new ApiError(httpStatus.BAD_REQUEST, 'Bill number is required');
        return ok(
            res,
            await billService.getSalesByBillNumber(shopOf(req), billNumber),
            'Sales bill fetched successfully',
        );
    }),

    list: catchAsync(async (req, res) => {
        const query = v.billListSchema.parse(req.query);
        return ok(
            res,
            await billService.listPurchase(shopOf(req), query),
            'Purchase bills fetched successfully',
        );
    }),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(
            res,
            await billService.getPurchase(shopOf(req), id),
            'Purchase bill fetched successfully',
        );
    }),

    create: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const data = v.createPurchaseBillSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'purchaseBill.create', module: 'billing'},
            async () => ({after: await billService.createPurchase(scope, req.user.id, data)}),
        );
        return ok(res, after, 'Purchase bill saved and stock updated', httpStatus.CREATED);
    }),

    update: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.updatePurchaseBillSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'purchaseBill.update', module: 'billing', targetId: id},
            async () => ({after: await billService.updatePurchase(scope, req.user.id, id, data)}),
        );
        return ok(res, after, 'Purchase bill updated and stock adjusted');
    }),

    confirm: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const {after} = await auditService.track(
            req,
            {action: 'purchaseBill.confirm', module: 'billing', targetId: id},
            async () => ({after: await billService.confirmPurchase(scope, req.user.id, id)}),
        );
        return ok(res, after, 'Purchase bill confirmed and stock added');
    }),

    cancel: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const {reason} = v.cancelBillSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'purchaseBill.cancel', module: 'billing', targetId: id, reason},
            async () => ({after: await billService.cancelPurchase(scope, req.user.id, id, reason)}),
        );
        return ok(res, after, 'Purchase bill cancelled and stock reversed');
    }),

    remove: removeBill('PURCHASE'),
    keep: keepBill('PURCHASE'),
    payment: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.recordPaymentSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'purchaseBill.payment', module: 'billing', targetId: id},
            async () => ({
                after: await billService.recordPayment('PURCHASE', scope, req.user.id, id, data),
            }),
        );
        return ok(res, after, 'Payment to supplier recorded');
    }),
};

const sales = {
    findByNumber: catchAsync(async (req, res) => {
        const billNumber = String(req.query.billNumber || req.params.billNumber || '');
        if (!billNumber.trim()) throw new ApiError(httpStatus.BAD_REQUEST, 'Bill number is required');
        return ok(
            res,
            await billService.getSalesByBillNumber(shopOf(req), billNumber),
            'Sales bill fetched successfully',
        );
    }),

    list: catchAsync(async (req, res) => {
        const query = v.billListSchema.parse(req.query);
        return ok(
            res,
            await billService.listSales(shopOf(req), query),
            'Sales bills fetched successfully',
        );
    }),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(
            res,
            await billService.getSales(shopOf(req), id),
            'Sales bill fetched successfully',
        );
    }),

    /** Amounts and GST split of a bill being typed; saves nothing, so it is not audited */
    preview: catchAsync(async (req, res) => {
        res.locals.audited = true;
        const data = v.previewSalesBillSchema.parse(req.body);
        return ok(res, await billService.previewSales(shopOf(req), data), 'Bill preview');
    }),

    create: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const data = v.createSalesBillSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'salesBill.create', module: 'billing'},
            async () => ({after: await billService.createSales(scope, req.user.id, data)}),
        );
        return ok(res, after, 'Sales bill saved and stock updated', httpStatus.CREATED);
    }),

    update: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.updateSalesBillSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'salesBill.update', module: 'billing', targetId: id},
            async () => ({after: await billService.updateSales(scope, req.user.id, id, data)}),
        );
        return ok(res, after, 'Sales bill updated and stock adjusted');
    }),

    confirm: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const {after} = await auditService.track(
            req,
            {action: 'salesBill.confirm', module: 'billing', targetId: id},
            async () => ({after: await billService.confirmSales(scope, req.user.id, id)}),
        );
        return ok(res, after, 'Sales bill confirmed and stock deducted');
    }),

    cancel: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const {reason} = v.cancelBillSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'salesBill.cancel', module: 'billing', targetId: id, reason},
            async () => ({after: await billService.cancelSales(scope, req.user.id, id, reason)}),
        );
        return ok(res, after, 'Sales bill cancelled and stock restored');
    }),

    remove: removeBill('SALES'),
    keep: keepBill('SALES'),
    payment: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.recordPaymentSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'salesBill.payment', module: 'billing', targetId: id},
            async () => ({
                after: await billService.recordPayment('SALES', scope, req.user.id, id, data),
            }),
        );
        return ok(res, after, 'Payment received');
    }),
};

/** Branch admin: read-only view of the sales bills of every shop in the branch */
const branchOf = (req: Request) => {
    const {companyId, branchId} = req.user;
    if (!companyId || !branchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch is linked to this account');
    }
    return {companyId, branchId};
};

const branchSales = {
    list: catchAsync(async (req, res) => {
        const query = v.branchSalesListSchema.parse(req.query);
        return ok(
            res,
            await billService.listSales(branchOf(req), query),
            'Sales bills fetched successfully',
        );
    }),

    summary: catchAsync(async (req, res) => {
        const query = v.branchSalesSummarySchema.parse(req.query);
        return ok(
            res,
            await billService.salesSummary(branchOf(req), query),
            'Sales summary fetched successfully',
        );
    }),

    export: catchAsync(async (req, res) => {
        const query = v.branchSalesListSchema.parse(req.query);
        return ok(
            res,
            await billService.exportSales(branchOf(req), query),
            'Sales bills exported successfully',
        );
    }),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(
            res,
            await billService.getSales(branchOf(req), id),
            'Sales bill fetched successfully',
        );
    }),
};



const customers = catchAsync(async (req, res) => {
    const q = String(req.query.q || '');
    return ok(res, await billService.searchCustomers(shopOf(req), q), 'Customers fetched');
});



export default {purchase, sales, branchSales, customers};
