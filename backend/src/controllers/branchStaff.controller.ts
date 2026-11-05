import httpStatus from 'http-status';
import {auditService, branchStaffService} from '@services/index';
import {catchAsync} from '@utils/index';
import {staffValidation as v} from '@validations/index';
import {branchOf, ok} from './scope';

const list = catchAsync(async (req, res) => {
    const str = (k: string) => (typeof req.query[k] === 'string' ? (req.query[k] as string) : undefined);
    const data = await branchStaffService.getStaff(branchOf(req), {
        tab: str('tab'),
        shop: str('shop'),
        search: str('search'),
    });
    return ok(res, data, 'Branch staff fetched successfully');
});

const invite = catchAsync(async (req, res) => {
    const scope = branchOf(req);
    const data = v.branchInviteSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'staff.invite', module: 'staff'},
        async () => ({after: await branchStaffService.inviteStaff(scope, req.user.id, data)}),
    );
    return ok(res, after, after.message, httpStatus.CREATED);
});

export default {list, invite};
