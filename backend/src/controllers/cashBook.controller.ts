import httpStatus from 'http-status';
import {auditService, cashBookService} from '@services/index';
import {catchAsync} from '@utils/index';
import {cashBookValidation as v} from '@validations/index';
import {ok, shopOf} from './scope';

/* Cash book & day close of the shop counter */

const getDay = catchAsync(async (req, res) => {
    const {date} = v.dayQuerySchema.parse(req.query);
    return ok(res, await cashBookService.getDay(shopOf(req), date), 'Cash book fetched successfully');
});

const addEntry = catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const data = v.addEntrySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: `cash.${data.type.toLowerCase()}`, module: 'billing'},
        async () => ({after: await cashBookService.addEntry(scope, req.user.id, data)}),
    );
    return ok(res, after, data.type === 'IN' ? 'Cash in recorded' : 'Cash out recorded', httpStatus.CREATED);
});

const bankDeposit = catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const data = v.bankDepositSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'cash.bankDeposit', module: 'billing'},
        async () => ({after: await cashBookService.bankDeposit(scope, req.user.id, data)}),
    );
    return ok(res, after, 'Bank deposit recorded', httpStatus.CREATED);
});

const closeDay = catchAsync(async (req, res) => {
    const scope = shopOf(req);
    const data = v.closeDaySchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'cash.dayClose', module: 'billing'},
        async () => ({after: await cashBookService.closeDay(scope, req.user.id, data)}),
    );
    return ok(res, after, "Day closed. Today's bills are locked.");
});

export default {getDay, addEntry, bankDeposit, closeDay};
