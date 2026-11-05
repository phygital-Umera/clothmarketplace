import httpStatus from 'http-status';
import {auditService, dayCloseService} from '@services/index';
import {catchAsync} from '@utils/index';
import {dayCloseValidation as v} from '@validations/index';
import {dayKey} from '../utils/day';
import {branchOf, ok} from './scope';

/* Branch admin: every shop's day close and the bank deposit */

const get = catchAsync(async (req, res) => {
    const {date} = v.dayQuerySchema.parse(req.query);
    const data = await dayCloseService.getDayClose(branchOf(req), date ?? dayKey());
    return ok(res, data, 'Day close data fetched successfully');
});

const resolveDifference = catchAsync(async (req, res) => {
    const scope = branchOf(req);
    const data = v.resolveDifferenceSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'dayClose.accept', module: 'billing', targetId: data.sessionId},
        async () => ({after: await dayCloseService.resolveDifference(scope, req.user.id, data)}),
    );
    return ok(res, after, after.message);
});

const recordDeposit = catchAsync(async (req, res) => {
    const scope = branchOf(req);
    const data = v.bankDepositSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'dayClose.bankDeposit', module: 'billing'},
        async () => ({after: await dayCloseService.recordDeposit(scope, req.user.id, data)}),
    );
    return ok(res, after, after.message, httpStatus.CREATED);
});

export default {get, resolveDifference, recordDeposit};
