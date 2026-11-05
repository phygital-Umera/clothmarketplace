import httpStatus from 'http-status';
import {AccountStatus, Prisma, Role, ShopStatus} from '@prisma/client';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {dateOnly, dayKey} from '../utils/day';
import {BranchScope} from './customerDue.service';
import staffService from './staff.service';

export type BranchStaffRow = {
    id: string;
    /** Set for INVITED rows: the pending staff request to approve / reject */
    requestId: string | null;
    name: string;
    empCode: string;
    phone: string;
    initials: string;
    shopId: string | null;
    shopName: string;
    role: string;
    shift: string | null;
    todayAttendance: string;
    status: 'ACTIVE' | 'INVITED' | 'INACTIVE';
};

const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'ST';

const timeOf = (d: Date) =>
    d.toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', hour12: true});

/**
 * Branch staff roster: the real employees and shop managers of the branch
 * with today's attendance, plus pending new-staff requests ("invited").
 */
class BranchStaffService {
    public async getStaff(scope: BranchScope, query: {tab?: string; shop?: string; search?: string}) {
        const search = query.search?.trim();
        const shopFilter = query.shop && query.shop !== 'ALL' ? query.shop : undefined;
        const userWhere: Prisma.UserWhereInput = {
            companyId: scope.companyId,
            branchId: scope.branchId,
            deletedAt: null,
            role: {in: [Role.EMPLOYEE, Role.SHOP_ADMIN]},
        };
        const [users, requests, attendance, shops] = await Promise.all([
            prisma.user.findMany({
                where: userWhere,
                select: {
                    id: true,
                    fullname: true,
                    employeeCode: true,
                    phoneNumber: true,
                    role: true,
                    employeeRole: true,
                    jobTitle: true,
                    shift: true,
                    status: true,
                    shopId: true,
                    shop: {select: {name: true}},
                },
                orderBy: {fullname: 'asc'},
            }),
            prisma.staffRequest.findMany({
                where: {companyId: scope.companyId, branchId: scope.branchId, status: 'PENDING'},
                include: {shop: {select: {name: true}}},
                orderBy: {createdAt: 'asc'},
            }),
            prisma.attendance.findMany({
                where: {date: dateOnly(dayKey()), shop: {branchId: scope.branchId}},
            }),
            prisma.shop.findMany({
                where: {
                    branchId: scope.branchId,
                    companyId: scope.companyId,
                    deletedAt: null,
                    status: ShopStatus.ACTIVE,
                },
                select: {id: true, name: true, code: true},
                orderBy: {name: 'asc'},
            }),
        ]);
        const byUser = new Map(attendance.map((a) => [a.userId, a]));

        const attendanceLabel = (userId: string) => {
            const a = byUser.get(userId);
            if (!a) return '—';
            if (a.status === 'IN') return a.inAt ? `In · ${timeOf(a.inAt)}` : 'In';
            if (a.status === 'OUT') return a.outAt ? `Out · ${timeOf(a.outAt)}` : 'Out';
            if (a.status === 'LEAVE') return 'On leave';
            return 'Absent';
        };

        const all: BranchStaffRow[] = [
            ...users.map((u) => ({
                id: u.id,
                requestId: null,
                name: u.fullname,
                empCode: u.employeeCode ?? '—',
                phone: u.phoneNumber,
                initials: initialsOf(u.fullname),
                shopId: u.shopId,
                shopName: u.shop?.name ?? 'Unassigned',
                role:
                    u.role === Role.SHOP_ADMIN
                        ? 'Shop manager'
                        : u.employeeRole || u.jobTitle || 'Staff',
                shift: u.shift,
                todayAttendance: attendanceLabel(u.id),
                status:
                    u.status === AccountStatus.ACTIVE || u.status === AccountStatus.PENDING_INVITATION
                        ? ('ACTIVE' as const)
                        : ('INACTIVE' as const),
            })),
            ...requests.map((r) => ({
                id: r.id,
                requestId: r.id,
                name: r.fullname,
                empCode: r.requestNumber,
                phone: r.phoneNumber,
                initials: initialsOf(r.fullname),
                shopId: r.shopId,
                shopName: r.shop.name,
                role: r.employeeRole,
                shift: r.shift,
                todayAttendance: '—',
                status: 'INVITED' as const,
            })),
        ];

        const items = all.filter(
            (r) =>
                (!query.tab || query.tab === 'ALL' || r.status === query.tab) &&
                (!shopFilter || r.shopId === shopFilter) &&
                (!search ||
                    [r.name, r.phone, r.empCode].some((v) =>
                        v.toLowerCase().includes(search.toLowerCase()),
                    )),
        );

        const active = all.filter((r) => r.status === 'ACTIVE');
        const onLeave = active.filter((r) => byUser.get(r.id)?.status === 'LEAVE').length;
        const onShift = active.filter((r) => byUser.get(r.id)?.status === 'IN').length;
        const unassigned = active.filter((r) => !r.shopId).length;
        return {
            shops,
            summary: {
                totalStaff: active.length,
                totalStaffSub: unassigned ? `+${unassigned} unassigned` : `${shops.length} shops`,
                onShiftNow: onShift,
                onShiftNowSub: `${onLeave} on leave`,
                invitesPending: requests.length,
                invitesPendingSub: requests[0]?.fullname ?? 'None pending',
            },
            totalCount: all.length,
            items,
        };
    }

    /** Branch admin adds staff to a shop: a request it can approve right away */
    public async inviteStaff(
        scope: BranchScope,
        actorId: string,
        payload: {
            fullname: string;
            phoneNumber: string;
            email?: string;
            shopId: string;
            employeeRole: string;
            shift: string;
            permissions: string[];
            note?: string;
        },
    ) {
        const shop = await prisma.shop.findFirst({
            where: {
                id: payload.shopId,
                branchId: scope.branchId,
                companyId: scope.companyId,
                deletedAt: null,
            },
            select: {id: true},
        });
        if (!shop) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Select a shop of this branch', [
                {field: 'shopId', message: 'Select a shop of this branch'},
            ]);
        }
        const request = await staffService.createRequest(
            {companyId: scope.companyId, shopId: shop.id},
            actorId,
            payload as any,
        );
        return {
            success: true,
            request,
            message: `${payload.fullname} added to pending staff. Approve to create the login.`,
        };
    }
}

export default new BranchStaffService();
