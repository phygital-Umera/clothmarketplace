import httpStatus from 'http-status';
import {AccountStatus, Role} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {BranchScope} from './customerDue.service';

/*
 * Which employee works in which shop of the branch, from the real users.
 * Moving someone changes their shop; each move is kept in the audit log
 * (action "employee.move"), which is also the history shown here.
 */

export const MOVE_ACTION = 'employee.move';

export const moveEmployeeSchema = z.object({
    employeeId: z.string({required_error: 'Choose an employee'}).uuid('Choose an employee'),
    targetShopId: z.string({required_error: 'Choose a shop'}).uuid('Choose a shop'),
    roleInShop: z.string().trim().max(80).optional(),
    reason: z.string().trim().max(300).optional(),
});
export type MoveEmployee = z.infer<typeof moveEmployeeSchema>;

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]!.toUpperCase())
        .join('');

class BranchShopAssignmentService {
    public async getAssignmentData(scope: BranchScope) {
        const [shops, people, history] = await Promise.all([
            prisma.shop.findMany({
                where: {branchId: scope.branchId, companyId: scope.companyId, deletedAt: null},
                select: {id: true, name: true, code: true},
                orderBy: {name: 'asc'},
            }),
            prisma.user.findMany({
                where: {
                    branchId: scope.branchId,
                    companyId: scope.companyId,
                    role: {in: [Role.EMPLOYEE, Role.SHOP_ADMIN]},
                    deletedAt: null,
                    status: {not: AccountStatus.INACTIVE},
                },
                select: {id: true, fullname: true, role: true, shopId: true, employeeRole: true, jobTitle: true},
                orderBy: {fullname: 'asc'},
            }),
            prisma.auditLog.findMany({
                where: {companyId: scope.companyId, action: MOVE_ACTION, result: 'SUCCESS', after: {path: ['branchId'], equals: scope.branchId}},
                orderBy: {createdAt: 'desc'},
                take: 20,
            }),
        ]);

        const shopName = (id: string | null) => shops.find((s) => s.id === id)?.name ?? 'No shop';
        const staff = people.filter((p) => p.role === Role.EMPLOYEE);

        const groups = shops.map((s) => {
            const members = staff.filter((p) => p.shopId === s.id);
            const managers = people.filter((p) => p.role === Role.SHOP_ADMIN && p.shopId === s.id);
            return {
                shopId: s.id,
                shopName: s.name,
                shopCode: s.code,
                staffCount: members.length,
                manager: managers.map((m) => m.fullname).join(', ') || '—',
                staff: members.map((m) => ({
                    id: m.id,
                    name: m.fullname,
                    initials: initials(m.fullname),
                    role: m.employeeRole || m.jobTitle || 'Staff',
                    shopName: s.name,
                })),
            };
        });

        const unassigned = staff
            .filter((p) => !p.shopId || !shops.some((s) => s.id === p.shopId))
            .map((m) => ({id: m.id, name: m.fullname, initials: initials(m.fullname), role: m.employeeRole || 'Staff', shopName: 'No shop'}));

        return {
            shops: shops.map((s) => ({id: s.id, name: s.name})),
            groups,
            unassigned,
            history: history.map((h) => {
                const after = (h.after ?? {}) as {employeeName?: string; fromShopId?: string | null; toShopId?: string; roleInShop?: string};
                return {
                    id: h.id,
                    employee: after.employeeName ?? '—',
                    fromTo: `${shopName(after.fromShopId ?? null)} → ${shopName(after.toShopId ?? null)}`,
                    role: after.roleInShop ?? '',
                    date: h.createdAt.toISOString(),
                    by: h.actorName ?? '—',
                    reason: h.reason ?? '',
                };
            }),
        };
    }

    /** Returns before/after for the audit log */
    public async moveEmployee(scope: BranchScope, data: MoveEmployee) {
        const [employee, shop] = await Promise.all([
            prisma.user.findFirst({
                where: {id: data.employeeId, branchId: scope.branchId, companyId: scope.companyId, role: Role.EMPLOYEE, deletedAt: null},
                select: {id: true, fullname: true, shopId: true, employeeRole: true},
            }),
            prisma.shop.findFirst({
                where: {id: data.targetShopId, branchId: scope.branchId, companyId: scope.companyId, deletedAt: null},
                select: {id: true, name: true},
            }),
        ]);
        if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found in this branch');
        if (!shop) throw new ApiError(httpStatus.NOT_FOUND, 'Shop not found in this branch');
        if (employee.shopId === shop.id) {
            throw new ApiError(httpStatus.BAD_REQUEST, `${employee.fullname} already works in ${shop.name}`);
        }

        await prisma.user.update({
            where: {id: employee.id},
            data: {shopId: shop.id, ...(data.roleInShop ? {employeeRole: data.roleInShop} : {})},
        });
        return {
            before: {shopId: employee.shopId},
            after: {
                id: employee.id,
                branchId: scope.branchId,
                employeeName: employee.fullname,
                fromShopId: employee.shopId,
                toShopId: shop.id,
                roleInShop: data.roleInShop ?? employee.employeeRole ?? undefined,
            },
            message: `${employee.fullname} moved to ${shop.name}`,
        };
    }
}

export default new BranchShopAssignmentService();
