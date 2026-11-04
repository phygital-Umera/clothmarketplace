import {Request} from 'express';
import httpStatus from 'http-status';
import {auditService, creditNoteService} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {creditNoteValidation as v} from '@validations/index';

/*
 * Sales returns (credit notes). Shops create them at the POS; the branch
 * admin approves cash refunds and refunds above the limit. Scope always
 * comes from the signed-in user.
 */
const shopOf = (req: Request) => {
    const {companyId, shopId} = req.user;
    if (!companyId || !shopId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    }
    return {companyId, shopId};
};

const branchOf = (req: Request) => {
    const {companyId, branchId} = req.user;
    if (!companyId || !branchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch is linked to this account');
    }
    return {companyId, branchId};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

const shop = {
    list: catchAsync(async (req, res) => {
        const query = v.creditNoteListSchema.parse(req.query);
        return ok(res, await creditNoteService.list(shopOf(req), query), 'Credit notes fetched');
    }),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(res, await creditNoteService.get(shopOf(req), id), 'Credit note fetched');
    }),

    returnable: catchAsync(async (req, res) => {
        const {bill} = v.returnableSchema.parse(req.query);
        return ok(res, await creditNoteService.returnable(shopOf(req), bill), 'Bill fetched');
    }),

    create: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const data = v.createCreditNoteSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'creditNote.create', module: 'billing', targetId: data.salesBillId},
            async () => ({after: await creditNoteService.create(scope, req.user.id, data)}),
        );
        return ok(
            res,
            after,
            after.status === 'PENDING_APPROVAL'
                ? 'Return saved; waiting for branch approval'
                : 'Return saved',
            httpStatus.CREATED,
        );
    }),
};

const branch = {
    list: catchAsync(async (req, res) => {
        const query = v.creditNoteListSchema.parse(req.query);
        return ok(res, await creditNoteService.list(branchOf(req), query), 'Credit notes fetched');
    }),

    summary: catchAsync(async (req, res) => {
        const query = v.creditNoteSummarySchema.parse(req.query);
        return ok(res, await creditNoteService.summary(branchOf(req), query), 'Summary fetched');
    }),

    get: catchAsync(async (req, res) => {
        const {id} = v.idSchema.parse(req.params);
        return ok(res, await creditNoteService.get(branchOf(req), id), 'Credit note fetched');
    }),

    decide: catchAsync(async (req, res) => {
        const scope = branchOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.decideCreditNoteSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {
                action: `creditNote.${data.action.toLowerCase()}`,
                module: 'billing',
                targetId: id,
                reason: data.note,
            },
            async () => ({after: await creditNoteService.decide(scope, req.user.id, id, data)}),
        );
        const message = {
            APPROVE: 'Refund approved',
            STORE_CREDIT: 'Settled as store credit',
            REJECT: 'Return rejected',
        }[data.action];
        return ok(res, after, message);
    }),
};

export default {shop, branch};
