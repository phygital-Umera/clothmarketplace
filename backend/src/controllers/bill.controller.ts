import {Request} from 'express';
import httpStatus from 'http-status';
import {auditService, billService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {billValidation as v} from '@validations/index';
import {ShopScope} from '../services/shopProduct.service';

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

const purchase = {
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

    remove: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        await auditService.track(
            req,
            {action: 'purchaseBill.delete', module: 'billing', targetId: id},
            async () => {
                await billService.deletePurchase(scope, req.user.id, id);
                return {};
            },
        );
        return ok(res, {}, 'Purchase bill deleted');
    }),
};

const sales = {
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

    remove: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        await auditService.track(
            req,
            {action: 'salesBill.delete', module: 'billing', targetId: id},
            async () => {
                await billService.deleteSales(scope, req.user.id, id);
                return {};
            },
        );
        return ok(res, {}, 'Sales bill deleted');
    }),
};

export default {purchase, sales};
