import httpStatus from 'http-status';
import {Prisma, Role} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {ApiError, encryptPassword} from '@utils/index';
import {listArgs, searchWhere, toListResult} from '../utils/list';
import {orgValidation} from '@validations/index';
import accountService, {SAFE_USER, Scope} from './account.service';
import shopService from './shop.service';

type CreateEmployee = z.infer<typeof orgValidation.createEmployeeSchema>;
type UpdateEmployee = z.infer<typeof orgValidation.updateEmployeeSchema>;
type EmployeeList = z.infer<typeof orgValidation.employeeListSchema>;

/**
 * Employees of a company (company admin) or of one branch (branch admin).
 * Every employee works in a shop; their branch is always the shop's branch.
 */
class EmployeeService {
    private scopeWhere(scope: Scope, id?: string): Prisma.UserWhereInput {
        return {
            ...(id ? {id} : {}),
            role: Role.EMPLOYEE,
            deletedAt: null,
            companyId: scope.companyId,
            ...(scope.branchId ? {branchId: scope.branchId} : {}),
            ...(scope.shopId ? {shopId: scope.shopId} : {}),
        };
    }

    public async list(scope: Scope, query: EmployeeList) {
        const where: Prisma.UserWhereInput = {
            ...this.scopeWhere(scope),
            status: query.status,
            ...(query.branchId && !scope.branchId ? {branchId: query.branchId} : {}),
            ...(query.shopId && !scope.shopId ? {shopId: query.shopId} : {}),
            OR: searchWhere(query.search, [
                'fullname',
                'email',
                'phoneNumber',
                'employeeCode',
                'jobTitle',
            ] as const),
        };
        const [items, total] = await prisma.$transaction([
            prisma.user.findMany({where, select: SAFE_USER, ...listArgs(query)}),
            prisma.user.count({where}),
        ]);
        return toListResult(items, total, query);
    }

    /** 404 outside the scope, so other companies' staff cannot be probed */
    public async get(scope: Scope, id: string) {
        const employee = await prisma.user.findFirst({
            where: this.scopeWhere(scope, id),
            select: SAFE_USER,
        });
        if (!employee) throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
        return employee;
    }

    /**
     * The shop must be active and inside the admin's scope (branch admins:
     * their own branch). Returns the shop's branch for the employee.
     */
    private async resolveShop(scope: Scope, requested?: string, branchId?: string) {
        // Shop admins always add to their own shop
        const shopId = scope.shopId ?? requested;
        if (!shopId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Assigned Shop is required', [
                {field: 'shopId', message: 'Assigned Shop is required'},
            ]);
        }
        const shop = await shopService.assertActiveInScope(scope, shopId);
        if (branchId && branchId !== shop.branchId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This shop is not in the selected branch', [
                {field: 'shopId', message: 'This shop is not in the selected branch'},
            ]);
        }
        return {shopId: shop.id, branchId: shop.branchId};
    }

    public async create(scope: Scope, data: CreateEmployee, actorId: string) {
        const {shopId, branchId} = await this.resolveShop(scope, data.shopId, data.branchId);
        await accountService.ensureLoginIsFree(data.phoneNumber, data.email);
        const password = await encryptPassword(data.password);
        const company = await prisma.company.findUniqueOrThrow({
            where: {id: scope.companyId},
            select: {code: true},
        });

        const created = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const employeeCode = await accountService.nextCode(
                        tx,
                        `${company.code}-E`,
                        3,
                        async (prefix) =>
                            (
                                await tx.user.findMany({
                                    where: {employeeCode: {startsWith: prefix}},
                                    select: {employeeCode: true},
                                })
                            ).map((u) => u.employeeCode ?? ''),
                    );
                    return tx.user.create({
                        data: {
                            fullname: data.fullname,
                            email: data.email,
                            phoneNumber: data.phoneNumber,
                            username: data.phoneNumber,
                            password,
                            role: Role.EMPLOYEE,
                            companyId: scope.companyId,
                            branchId,
                            shopId,
                            employeeCode,
                            jobTitle: data.jobTitle,
                            department: data.department,
                            joiningDate: data.joiningDate,
                            permissions: data.permissions,
                            isVerified: true,
                            createdById: actorId,
                        },
                        select: {id: true},
                    });
                }),
            'employeeCode',
        );
        return this.get(scope, created.id);
    }

    public async update(scope: Scope, id: string, data: UpdateEmployee) {
        const before = await this.get(scope, id);
        const {
            password: newPassword,
            branchId: requestedBranch,
            shopId: requestedShop,
            ...fields
        } = data;

        // Moving to another shop (and with it, maybe another branch). Branch
        // admins only see their own branch's shops, so they cannot move people out.
        const shopId =
            !scope.shopId && requestedShop && requestedShop !== before.shopId
                ? requestedShop
                : undefined;
        const newBranch = shopId
            ? (await this.resolveShop(scope, shopId, scope.branchId ? undefined : requestedBranch))
                  .branchId
            : undefined;
        if (!shopId && !scope.branchId && requestedBranch && requestedBranch !== before.branchId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Select a shop in the new branch', [
                {field: 'shopId', message: 'Select a shop in the new branch'},
            ]);
        }
        const branchId = newBranch !== before.branchId ? newBranch : undefined;
        await accountService.ensureLoginIsFree(fields.phoneNumber, fields.email, id);

        const permissionsChanged =
            fields.permissions &&
            fields.permissions.slice().sort().join() !== before.permissions.slice().sort().join();
        const password = newPassword ? await encryptPassword(newPassword) : undefined;

        await prisma.user.update({
            where: {id},
            data: {
                ...fields,
                ...(fields.phoneNumber ? {username: fields.phoneNumber} : {}),
                ...(shopId ? {shopId} : {}),
                ...(branchId ? {branchId} : {}),
                ...(password ? {password} : {}),
                // New password, other branch or other permissions: sign in again
                ...(password || branchId || permissionsChanged
                    ? {refreshToken: null, sessionsRevokedAt: new Date()}
                    : {}),
            },
        });
        return {before, after: await this.get(scope, id)};
    }
}

export default new EmployeeService();
