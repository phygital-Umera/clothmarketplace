import httpStatus from 'http-status';
import {auditService, stockTransferService as s} from '@services/index';
import {catchAsync} from '@utils/index';
import {stockTransferValidation as v} from '@validations/index';
import {branchOf, ok, shopOf} from './scope';

/* Stock transfer between the shops of a branch */

const shop = {
    shops: catchAsync(async (req, res) =>
        ok(res, await s.shops(shopOf(req)), 'Shops fetched successfully'),
    ),

    variants: catchAsync(async (req, res) => {
        const {search} = v.variantSearchSchema.parse(req.query);
        return ok(res, await s.variants(shopOf(req), search), 'Items fetched successfully');
    }),

    list: catchAsync(async (req, res) => {
        const query = v.shopListSchema.parse(req.query);
        return ok(res, await s.listShop(shopOf(req), query), 'Transfers fetched successfully');
    }),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(res, await s.getShop(shopOf(req), id), 'Transfer fetched successfully');
    }),

    create: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const data = v.createTransferSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'transfer.request', module: 'inventory'},
            async () => ({after: await s.create(scope, req.user.id, data)}),
        );
        return ok(res, after, `Request ${after.transferNumber} sent to the Branch Admin`, httpStatus.CREATED);
    }),

    dispatch: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const {after} = await auditService.track(
            req,
            {action: 'transfer.dispatch', module: 'inventory', targetId: id},
            async () => ({after: await s.dispatch(scope, req.user.id, id)}),
        );
        return ok(res, after, `${after.transferNumber} dispatched`);
    }),

    receive: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.receiveSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'transfer.receive', module: 'inventory', targetId: id},
            async () => ({after: await s.receive(scope, req.user.id, id, data)}),
        );
        return ok(
            res,
            after,
            after.status === 'SHORT'
                ? `${after.transferNumber} received short by ${after.shortUnits}. Branch Admin will review.`
                : `${after.transferNumber} received and added to stock`,
        );
    }),
};

const branch = {
    list: catchAsync(async (req, res) => {
        const query = v.branchListSchema.parse(req.query);
        return ok(res, await s.listBranch(branchOf(req), query), 'Stock transfers fetched successfully');
    }),

    summary: catchAsync(async (req, res) =>
        ok(res, await s.summary(branchOf(req)), 'Stock transfer summary fetched successfully'),
    ),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(res, await s.getBranch(branchOf(req), id), 'Transfer details fetched successfully');
    }),

    sources: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(res, await s.sourceOptions(branchOf(req), id), 'Source shops fetched successfully');
    }),

    decide: catchAsync(async (req, res) => {
        const scope = branchOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.decideSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: `transfer.${data.decision.toLowerCase()}`, module: 'inventory', targetId: id},
            async () => ({after: await s.decide(scope, req.user.id, id, data)}),
        );
        return ok(
            res,
            after,
            data.decision === 'APPROVE'
                ? `${after.transferNumber} approved. ${after.fromShop?.name ?? 'The source shop'} will dispatch.`
                : `${after.transferNumber} rejected`,
        );
    }),
};

export default {shop, branch};
