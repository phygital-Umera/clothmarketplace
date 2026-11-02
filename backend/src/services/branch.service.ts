import httpStatus from 'http-status';
import {AccountStatus, BranchStatus, Prisma, Role} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {ApiError, encryptPassword} from '@utils/index';
import {listArgs, searchWhere, toListResult} from '../utils/list';
import {orgValidation} from '@validations/index';
import accountService, {Scope} from './account.service';

type CreateBranch = z.infer<typeof orgValidation.createBranchSchema>;
// status is only set through setStatus (the form cannot change it)
type UpdateBranch = z.infer<typeof orgValidation.updateBranchSchema> & {status?: BranchStatus};
type BranchList = z.infer<typeof orgValidation.branchListSchema>;

const ADMIN_FIELDS = {phone: 'adminPhone', email: 'adminEmail'};

const BRANCH_LIST_INCLUDE = {
    company: {select: {id: true, name: true, code: true}},
    users: {
        where: {role: Role.SUB_ADMIN, deletedAt: null},
        select: {id: true, fullname: true, email: true, phoneNumber: true, status: true},
        take: 1,
    },
    _count: {
        select: {
            users: {where: {role: Role.EMPLOYEE, deletedAt: null}},
            shops: {where: {deletedAt: null}},
        },
    },
} satisfies Prisma.BranchInclude;

type BranchRow = Prisma.BranchGetPayload<{include: typeof BRANCH_LIST_INCLUDE}>;

/** Flatten for the API: branchAdmin + counts instead of users/_count */
const present = ({users, _count, ...branch}: BranchRow) => ({
    ...branch,
    branchAdmin: users[0] ?? null,
    employeeCount: _count.users,
    shopCount: _count.shops,
});

class BranchService {
    private scopeWhere(scope: Scope, id?: string): Prisma.BranchWhereInput {
        return {
            ...(id ? {id} : {}),
            deletedAt: null,
            ...(scope.companyId ? {companyId: scope.companyId} : {}),
            ...(scope.branchId ? {id: scope.branchId} : {}),
        };
    }

    public async list(scope: Scope, query: BranchList) {
        const where: Prisma.BranchWhereInput = {
            ...this.scopeWhere(scope),
            status: query.status,
            // companyId filter only matters for the super admin (others are scoped)
            ...(query.companyId && !scope.companyId ? {companyId: query.companyId} : {}),
            OR: searchWhere(query.search, ['name', 'code', 'city', 'email'] as const),
        };
        const [items, total, active, inactive] = await prisma.$transaction([
            prisma.branch.findMany({where, include: BRANCH_LIST_INCLUDE, ...listArgs(query)}),
            prisma.branch.count({where}),
            prisma.branch.count({where: {...this.scopeWhere(scope), status: BranchStatus.ACTIVE}}),
            prisma.branch.count({
                where: {...this.scopeWhere(scope), status: BranchStatus.INACTIVE},
            }),
        ]);
        return {
            ...toListResult(items.map(present), total, query),
            summary: {total: active + inactive, active, inactive},
        };
    }

    /** 404 for branches outside the scope: no probing other companies */
    public async get(scope: Scope, id: string) {
        const branch = await prisma.branch.findFirst({
            where: this.scopeWhere(scope, id),
            include: BRANCH_LIST_INCLUDE,
        });
        if (!branch) throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
        return present(branch);
    }

    /** Active branches of a company, for the employee form's branch picker */
    public async options(companyId: string) {
        return prisma.branch.findMany({
            where: {companyId, deletedAt: null, status: BranchStatus.ACTIVE},
            select: {id: true, name: true, code: true},
            orderBy: {name: 'asc'},
        });
    }

    public async create(companyId: string, data: CreateBranch, actorId: string) {
        const {adminName, adminEmail, adminPhone, adminPassword, ...fields} = data;
        const withAdmin = !!adminName;
        if (withAdmin && !adminPassword) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Admin Password is required', [
                {field: 'adminPassword', message: 'Admin Password is required'},
            ]);
        }
        if (withAdmin)
            await accountService.ensureLoginIsFree(adminPhone, adminEmail, undefined, ADMIN_FIELDS);
        const password = adminPassword ? await encryptPassword(adminPassword) : undefined;
        const company = await prisma.company.findUniqueOrThrow({
            where: {id: companyId},
            select: {code: true},
        });

        const branch = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const code = await accountService.nextCode(
                        tx,
                        `${company.code}-B`,
                        2,
                        async (prefix) =>
                            (
                                await tx.branch.findMany({
                                    where: {code: {startsWith: prefix}},
                                    select: {code: true},
                                })
                            ).map((b) => b.code),
                    );
                    const created = await tx.branch.create({data: {...fields, code, companyId}});
                    if (withAdmin && password) {
                        await tx.user.create({
                            data: {
                                fullname: adminName!,
                                email: adminEmail,
                                phoneNumber: adminPhone!,
                                username: adminPhone,
                                password,
                                role: Role.SUB_ADMIN,
                                companyId,
                                branchId: created.id,
                                isVerified: true,
                                createdById: actorId,
                            },
                        });
                    }
                    return created;
                }),
            'code',
        );
        return this.get({companyId}, branch.id);
    }

    public async update(scope: Scope, id: string, data: UpdateBranch, actorId: string) {
        const before = await this.get(scope, id);
        const {adminName, adminEmail, adminPhone, adminPassword, ...fields} = data;
        const admin = before.branchAdmin;

        if (adminName && !admin && !adminPassword) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Admin Password is required', [
                {
                    field: 'adminPassword',
                    message: 'Set a password to create the branch admin login',
                },
            ]);
        }
        if (adminName)
            await accountService.ensureLoginIsFree(adminPhone, adminEmail, admin?.id, ADMIN_FIELDS);
        const password = adminPassword ? await encryptPassword(adminPassword) : undefined;

        await prisma.$transaction(async (tx) => {
            const updated = await tx.branch.update({where: {id}, data: fields});
            const deactivated = updated.status !== BranchStatus.ACTIVE;
            if (adminName) {
                const login = {
                    fullname: adminName,
                    email: adminEmail,
                    phoneNumber: adminPhone!,
                    username: adminPhone,
                };
                // A new password ends the sessions signed in with the old one
                const newPassword = password ? {password, refreshToken: null} : {};
                if (admin) {
                    await tx.user.update({where: {id: admin.id}, data: {...login, ...newPassword}});
                } else if (password) {
                    await tx.user.create({
                        data: {
                            ...login,
                            password,
                            role: Role.SUB_ADMIN,
                            companyId: updated.companyId,
                            branchId: id,
                            isVerified: true,
                            createdById: actorId,
                        },
                    });
                }
            }
            // A deactivated branch: its admin and employees are signed out
            if (deactivated) {
                await tx.user.updateMany({
                    where: {branchId: id},
                    data: {refreshToken: null, sessionsRevokedAt: new Date()},
                });
            }
        });
        return {before, after: await this.get(scope, id)};
    }

    public async setStatus(scope: Scope, id: string, status: BranchStatus, actorId: string) {
        return this.update(scope, id, {status}, actorId);
    }

    /** Branch admin's own branch, for the branch profile page */
    public async ofUser(branchId: string) {
        return this.get({branchId}, branchId);
    }

    /** Is this an active branch of the company? (employee assignment) */
    public async assertActiveInCompany(companyId: string, branchId: string) {
        const branch = await prisma.branch.findFirst({
            where: {id: branchId, companyId, deletedAt: null, status: BranchStatus.ACTIVE},
            select: {id: true},
        });
        if (!branch) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Select an active branch of your company', [
                {field: 'branchId', message: 'Select an active branch of your company'},
            ]);
        }
    }

    /** Counts used by dashboards */
    public async counts(scope: Scope) {
        const base = this.scopeWhere(scope);
        const users = (role: Role, status?: AccountStatus) =>
            prisma.user.count({
                where: {
                    role,
                    deletedAt: null,
                    status,
                    ...(scope.companyId ? {companyId: scope.companyId} : {}),
                    ...(scope.branchId ? {branchId: scope.branchId} : {}),
                },
            });
        const [branches, activeBranches, branchAdmins, employees, activeEmployees] =
            await Promise.all([
                prisma.branch.count({where: base}),
                prisma.branch.count({where: {...base, status: BranchStatus.ACTIVE}}),
                users(Role.SUB_ADMIN),
                users(Role.EMPLOYEE),
                users(Role.EMPLOYEE, AccountStatus.ACTIVE),
            ]);
        return {branches, activeBranches, branchAdmins, employees, activeEmployees};
    }
}

export default new BranchService();
