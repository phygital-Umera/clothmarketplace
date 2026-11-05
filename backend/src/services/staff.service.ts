import httpStatus from 'http-status';
import {AccountStatus, Role} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {STAFF_RIGHTS} from '../config/permissions';
import {dateOnly, dayKey} from '../utils/day';
import {staffValidation} from '@validations/index';
import accountService from './account.service';
import billService from './bill.service';
import employeeService from './employee.service';
import {BranchScope} from './customerDue.service';
import {ShopScope} from './shopProduct.service';

type Attendance = z.infer<typeof staffValidation.attendanceSchema>;
type CreateRequest = z.infer<typeof staffValidation.createStaffRequestSchema>;
type DecideRequest = z.infer<typeof staffValidation.decideStaffRequestSchema>;

const RIGHT_KEYS: string[] = STAFF_RIGHTS.map((r) => r.key);

/** Shift start / end; evening starts at 15:00, the rest follow the shop hours */
const shiftHours = (shift: string | null, opening?: string | null, closing?: string | null) => {
    const open = opening || '09:30';
    const close = closing || '21:00';
    if (shift === 'MORNING') return {start: open, end: '15:00'};
    if (shift === 'EVENING') return {start: '15:00', end: close};
    return {start: open, end: close};
};

/**
 * The shop's team: rights (POS, discount, credit sale ...), shifts and the
 * day's attendance. New staff are requested here and created by the branch
 * admin on approval.
 */
class StaffService {
    private shopUsers = (shopId: string) =>
        prisma.user.findMany({
            where: {
                shopId,
                deletedAt: null,
                role: {in: [Role.SHOP_ADMIN, Role.EMPLOYEE]},
                status: {in: [AccountStatus.ACTIVE, AccountStatus.PENDING_INVITATION]},
            },
            orderBy: [{role: 'desc'}, {fullname: 'asc'}],
            select: {
                id: true,
                fullname: true,
                role: true,
                employeeCode: true,
                employeeRole: true,
                jobTitle: true,
                shift: true,
                permissions: true,
                phoneNumber: true,
                lastLoginAt: true,
            },
        });

    public list = async (scope: ShopScope, date?: string) => {
        const shop = await billService.shopContext(scope);
        const key = date ?? dayKey();
        const [shopRow, users, attendance, pendingRequests] = await Promise.all([
            prisma.shop.findUniqueOrThrow({
                where: {id: shop.id},
                select: {openingTime: true, closingTime: true},
            }),
            this.shopUsers(shop.id),
            prisma.attendance.findMany({where: {shopId: shop.id, date: dateOnly(key)}}),
            prisma.staffRequest.count({where: {shopId: shop.id, status: 'PENDING'}}),
        ]);
        const byUser = new Map(attendance.map((a) => [a.userId, a]));

        const items = users.map((u) => {
            const manager = u.role === Role.SHOP_ADMIN;
            const a = byUser.get(u.id);
            return {
                id: u.id,
                fullname: u.fullname,
                employeeCode: u.employeeCode,
                phoneNumber: u.phoneNumber,
                isManager: manager,
                role: manager ? 'Shop manager' : u.employeeRole || u.jobTitle || 'Staff',
                shift: u.shift ?? 'FULL_DAY',
                shiftHours: shiftHours(u.shift, shopRow.openingTime, shopRow.closingTime),
                // The manager holds every shop right
                permissions: manager ? RIGHT_KEYS : u.permissions,
                attendance: a
                    ? {status: a.status, inAt: a.inAt, outAt: a.outAt, note: a.note}
                    : null,
            };
        });

        const count = (s: string) => items.filter((i) => i.attendance?.status === s).length;
        return {
            date: key,
            rights: STAFF_RIGHTS,
            items,
            summary: {
                total: items.length,
                in: count('IN'),
                onLeave: count('LEAVE'),
                pendingRequests,
            },
        };
    };

    /** Only employees of this shop; the shop manager's own rights are fixed */
    private employeeOf = async (shopId: string, userId: string) => {
        const user = await prisma.user.findFirst({
            where: {id: userId, shopId, deletedAt: null, role: {in: [Role.EMPLOYEE, Role.SHOP_ADMIN]}},
            select: {id: true, role: true, permissions: true, shift: true, fullname: true},
        });
        if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'Staff member not found in this shop');
        return user;
    };

    /**
     * Replace the shop rights of an employee. Other permissions given by the
     * branch or company admin (products, reports ...) are kept. Rights are
     * read from the database on every request, so they apply at once.
     */
    public updateRights = async (scope: ShopScope, userId: string, permissions: string[]) => {
        const shop = await billService.shopContext(scope);
        const user = await this.employeeOf(shop.id, userId);
        if (user.role !== Role.EMPLOYEE) {
            throw new ApiError(httpStatus.BAD_REQUEST, "The shop manager's rights cannot be changed here");
        }
        const shopRights = permissions.filter((p) => RIGHT_KEYS.includes(p));
        const kept = user.permissions.filter((p) => !RIGHT_KEYS.includes(p));
        const after = await prisma.user.update({
            where: {id: userId},
            data: {permissions: [...new Set([...kept, ...shopRights])]},
            select: {id: true, fullname: true, permissions: true},
        });
        return {before: {id: user.id, permissions: user.permissions}, after};
    };

    public updateShift = async (scope: ShopScope, userId: string, shift: string) => {
        const shop = await billService.shopContext(scope);
        const user = await this.employeeOf(shop.id, userId);
        const after = await prisma.user.update({
            where: {id: userId},
            data: {shift},
            select: {id: true, fullname: true, shift: true},
        });
        return {before: {id: user.id, shift: user.shift}, after};
    };

    /** Mark today's attendance by hand (in, out, on leave, absent) */
    public markAttendance = async (
        scope: ShopScope,
        actorId: string,
        userId: string,
        data: Attendance,
    ) => {
        const shop = await billService.shopContext(scope);
        await this.employeeOf(shop.id, userId);
        const date = dateOnly(dayKey());
        const now = new Date();
        const existing = await prisma.attendance.findUnique({
            where: {userId_date: {userId, date}},
        });
        if (data.status === 'OUT' && existing?.status !== 'IN') {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Only staff who are in can be marked out');
        }
        const times =
            data.status === 'IN'
                ? {inAt: existing?.inAt ?? now, outAt: null}
                : data.status === 'OUT'
                  ? {outAt: now}
                  : {inAt: null, outAt: null};
        return prisma.attendance.upsert({
            where: {userId_date: {userId, date}},
            create: {
                userId,
                shopId: shop.id,
                date,
                status: data.status,
                note: data.note,
                markedById: actorId,
                ...times,
            },
            update: {status: data.status, note: data.note ?? null, markedById: actorId, ...times},
        });
    };

    /**
     * First sign-in of the day marks shop staff in. Never overrides a status
     * the manager already set (e.g. on leave) and never fails the login.
     */
    public autoClockIn = async (user: {id: string; role: Role; shopId: string | null}) => {
        if (!user.shopId || (user.role !== Role.EMPLOYEE && user.role !== Role.SHOP_ADMIN)) return;
        try {
            await prisma.attendance.createMany({
                data: [
                    {
                        userId: user.id,
                        shopId: user.shopId,
                        date: dateOnly(dayKey()),
                        status: 'IN',
                        inAt: new Date(),
                    },
                ],
                skipDuplicates: true,
            });
        } catch (error) {
            console.error('Auto clock-in failed', error);
        }
    };

    // ---- New staff requests ----

    public createRequest = async (scope: ShopScope, actorId: string, data: CreateRequest) => {
        const shop = await billService.shopContext(scope);
        await accountService.ensureLoginIsFree(data.phoneNumber, data.email);
        const pending = await prisma.staffRequest.findFirst({
            where: {phoneNumber: data.phoneNumber, status: 'PENDING'},
        });
        if (pending) {
            throw new ApiError(httpStatus.CONFLICT, 'A request for this phone number is already pending', [
                {field: 'phoneNumber', message: 'Already requested'},
            ]);
        }
        const permissions = data.permissions.filter((p) => RIGHT_KEYS.includes(p));
        return accountService.withRetry(async () => {
            const requestNumber = await accountService.nextCode(
                prisma,
                'SR-',
                4,
                async (prefix) =>
                    (
                        await prisma.staffRequest.findMany({
                            where: {requestNumber: {startsWith: prefix}},
                            select: {requestNumber: true},
                        })
                    ).map((r) => r.requestNumber),
            );
            return prisma.staffRequest.create({
                data: {
                    requestNumber,
                    companyId: shop.companyId,
                    branchId: shop.branchId,
                    shopId: shop.id,
                    fullname: data.fullname,
                    phoneNumber: data.phoneNumber,
                    email: data.email,
                    employeeRole: data.employeeRole,
                    shift: data.shift,
                    permissions,
                    note: data.note,
                    createdById: actorId,
                },
            });
        }, 'requestNumber');
    };

    public listShopRequests = async (scope: ShopScope) => {
        const shop = await billService.shopContext(scope);
        return prisma.staffRequest.findMany({
            where: {shopId: shop.id},
            orderBy: {createdAt: 'desc'},
            take: 50,
        });
    };

    public listBranchRequests = async (scope: BranchScope, status?: string) =>
        prisma.staffRequest.findMany({
            where: {companyId: scope.companyId, branchId: scope.branchId, ...(status ? {status} : {})},
            orderBy: [{status: 'desc'}, {createdAt: 'desc'}],
            include: {shop: {select: {id: true, name: true, code: true}}},
            take: 100,
        });

    /**
     * Branch admin approves (creates the employee login in the shop with the
     * requested rights and shift) or rejects a request.
     */
    public decideRequest = async (
        scope: BranchScope,
        actorId: string,
        id: string,
        data: DecideRequest,
    ) => {
        const request = await prisma.staffRequest.findFirst({
            where: {id, companyId: scope.companyId, branchId: scope.branchId},
        });
        if (!request) throw new ApiError(httpStatus.NOT_FOUND, 'Staff request not found');
        if (request.status !== 'PENDING') {
            throw new ApiError(httpStatus.CONFLICT, 'This request has already been decided');
        }

        if (data.decision === 'REJECT') {
            return prisma.staffRequest.update({
                where: {id},
                data: {
                    status: 'REJECTED',
                    decidedById: actorId,
                    decidedAt: new Date(),
                    decisionNote: data.note,
                },
            });
        }

        // Claim the request first so two approvals cannot create two logins
        const {count} = await prisma.staffRequest.updateMany({
            where: {id, status: 'PENDING'},
            data: {status: 'APPROVED', decidedById: actorId, decidedAt: new Date(), decisionNote: data.note},
        });
        if (!count) throw new ApiError(httpStatus.CONFLICT, 'This request has already been decided');
        try {
            const employee = await employeeService.create(
                {companyId: scope.companyId, branchId: scope.branchId},
                {
                    fullname: request.fullname,
                    phoneNumber: request.phoneNumber,
                    email: request.email ?? undefined,
                    shopId: request.shopId,
                    employeeRole: request.employeeRole,
                    permissions: request.permissions as any,
                    password: data.password as string,
                } as any,
                actorId,
            );
            await prisma.user.update({
                where: {id: employee.id},
                data: {shift: request.shift, mustChangePassword: true},
            });
            return prisma.staffRequest.update({
                where: {id},
                data: {createdUserId: employee.id},
            });
        } catch (error) {
            await prisma.staffRequest.update({
                where: {id},
                data: {status: 'PENDING', decidedById: null, decidedAt: null, decisionNote: null},
            });
            throw error;
        }
    };
}

export default new StaffService();
