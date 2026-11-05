import httpStatus from 'http-status';
import {auditService, staffService} from '@services/index';
import {catchAsync} from '@utils/index';
import {staffValidation as v} from '@validations/index';
import {branchOf, ok, shopOf} from './scope';

/* Staff & rights: the shop's team, its rights, shifts, attendance and new-staff requests */

const shop = {
    list: catchAsync(async (req, res) => {
        const {date} = v.staffListSchema.parse(req.query);
        return ok(res, await staffService.list(shopOf(req), date), 'Staff fetched successfully');
    }),

    updateRights: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const {permissions} = v.updateRightsSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'staff.rights', module: 'staff', targetId: id},
            () => staffService.updateRights(scope, id, permissions),
        );
        return ok(res, after, 'Rights updated');
    }),

    updateShift: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const {shift} = v.updateShiftSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'staff.shift', module: 'staff', targetId: id},
            () => staffService.updateShift(scope, id, shift),
        );
        return ok(res, after, 'Shift updated');
    }),

    attendance: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.attendanceSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'staff.attendance', module: 'staff', targetId: id},
            async () => ({after: await staffService.markAttendance(scope, req.user.id, id, data)}),
        );
        return ok(res, after, 'Attendance marked');
    }),

    listRequests: catchAsync(async (req, res) =>
        ok(res, await staffService.listShopRequests(shopOf(req)), 'Staff requests fetched successfully'),
    ),

    createRequest: catchAsync(async (req, res) => {
        const scope = shopOf(req);
        const data = v.createStaffRequestSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: 'staff.request', module: 'staff'},
            async () => ({after: await staffService.createRequest(scope, req.user.id, data)}),
        );
        return ok(res, after, 'Request sent to the Branch Admin', httpStatus.CREATED);
    }),
};

const branch = {
    listRequests: catchAsync(async (req, res) => {
        const {status} = v.staffRequestListSchema.parse(req.query);
        return ok(
            res,
            await staffService.listBranchRequests(branchOf(req), status),
            'Staff requests fetched successfully',
        );
    }),

    decideRequest: catchAsync(async (req, res) => {
        const scope = branchOf(req);
        const {id} = v.idSchema.parse(req.params);
        const data = v.decideStaffRequestSchema.parse(req.body);
        const {after} = await auditService.track(
            req,
            {action: `staff.request.${data.decision.toLowerCase()}`, module: 'staff', targetId: id},
            async () => ({after: await staffService.decideRequest(scope, req.user.id, id, data)}),
        );
        return ok(
            res,
            after,
            data.decision === 'APPROVE' ? 'Staff login created' : 'Request rejected',
        );
    }),
};

export default {shop, branch};
