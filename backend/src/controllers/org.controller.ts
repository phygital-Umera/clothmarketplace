import {Request} from 'express';
import httpStatus from 'http-status';
import {Role} from '@prisma/client';
import {
    accountService,
    auditService,
    branchService,
    branchOverviewService,
    companyService,
    employeeService,
    shopService,
} from '@services/index';
import {catchAsync, ApiError, ApiResponse} from '@utils/index';
import {orgValidation} from '@validations/index';
import {Scope} from '../services/account.service';
import prisma from '../client';

/*
 * Branches, shops, employees, users and dashboards for the three admin panels.
 * The scope always comes from the signed-in user, never from the request:
 *   super admin   -> everything
 *   company admin -> their company
 *   branch admin  -> their branch
 *   shop admin    -> their shop
 */
const scopeOf = (req: Request): Scope => {
    const {role, companyId, branchId, shopId} = req.user;
    if (role === Role.SUPER_ADMIN) return {};
    if (!companyId)
        throw new ApiError(httpStatus.FORBIDDEN, 'No company is linked to this account');
    if (role === Role.ADMIN) return {companyId};
    if (!branchId) throw new ApiError(httpStatus.FORBIDDEN, 'No branch is linked to this account');
    if (role !== Role.SHOP_ADMIN) return {companyId, branchId};
    if (!shopId) throw new ApiError(httpStatus.FORBIDDEN, 'No shop is linked to this account');
    return {companyId, branchId, shopId};
};

const ok = (
    res: Parameters<Parameters<typeof catchAsync>[0]>[1],
    data: unknown,
    message: string,
    status = 200,
) => res.status(status).json(new ApiResponse(status, data, message));

// ---- Branches -----------------------------------------------------------

const listBranches = catchAsync(async (req, res) => {
    const query = orgValidation.branchListSchema.parse(req.query);
    return ok(res, await branchService.list(scopeOf(req), query), 'Branches fetched successfully');
});

const getBranch = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    return ok(res, await branchService.get(scopeOf(req), id), 'Branch fetched successfully');
});

/** Active branches for pickers (employee form) */
const branchOptions = catchAsync(async (req, res) => {
    const {companyId} = scopeOf(req);
    return ok(
        res,
        companyId ? await branchService.options(companyId) : [],
        'Branches fetched successfully',
    );
});

const createBranch = catchAsync(async (req, res) => {
    const data = orgValidation.createBranchSchema.parse(req.body);
    const {companyId} = scopeOf(req);
    const {after} = await auditService.track(
        req,
        {action: 'branch.create', module: 'branches'},
        async () => ({
            after: await branchService.create(companyId!, data, req.user.id),
        }),
    );
    return ok(res, after, 'Branch created successfully', httpStatus.CREATED);
});

const updateBranch = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    const data = orgValidation.updateBranchSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'branch.update', module: 'branches', targetId: id},
        () => branchService.update(scopeOf(req), id, data, req.user.id),
    );
    return ok(res, after, 'Branch updated successfully');
});

const setBranchStatus = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    const {status, reason} = orgValidation.branchStatusSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {
            action: `branch.${status === 'ACTIVE' ? 'activate' : 'deactivate'}`,
            module: 'branches',
            targetId: id,
            reason,
        },
        () => branchService.setStatus(scopeOf(req), id, status, req.user.id),
    );
    return ok(res, after, status === 'ACTIVE' ? 'Branch activated' : 'Branch deactivated');
});

// ---- Shops (inside branches) ---------------------------------------------

const listShops = catchAsync(async (req, res) => {
    const query = orgValidation.shopListSchema.parse(req.query);
    return ok(res, await shopService.list(scopeOf(req), query), 'Shops fetched successfully');
});

const getShop = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    return ok(res, await shopService.get(scopeOf(req), id), 'Shop fetched successfully');
});

/** Active shops for pickers (employee form), optionally of one branch */
const shopOptions = catchAsync(async (req, res) => {
    const {branchId} = orgValidation.shopOptionsSchema.parse(req.query);
    return ok(res, await shopService.options(scopeOf(req), branchId), 'Shops fetched successfully');
});

/** Branch Shops page: stock, sales and next bill number per shop */
const shopStats = catchAsync(async (req, res) => {
    return ok(res, await shopService.branchStats(scopeOf(req)), 'Shop figures fetched');
});

const createShop = catchAsync(async (req, res) => {
    const data = orgValidation.createShopSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'shop.create', module: 'shops'},
        async () => ({after: await shopService.create(scopeOf(req), data, req.user.id)}),
    );
    return ok(res, after, 'Shop created successfully', httpStatus.CREATED);
});

const updateShop = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    const data = orgValidation.updateShopSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'shop.update', module: 'shops', targetId: id},
        () => shopService.update(scopeOf(req), id, data, req.user.id),
    );
    return ok(res, after, 'Shop updated successfully');
});

const setShopStatus = catchAsync(async (req, res) => {
    // Branch admins add shops; opening or closing one is the company admin's call
    if (req.user.role === Role.SUB_ADMIN) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            'Activating or closing a shop needs the Company Admin',
        );
    }
    const {id} = orgValidation.idSchema.parse(req.params);
    const {status, reason} = orgValidation.shopStatusSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {
            action: `shop.${status === 'ACTIVE' ? 'activate' : 'deactivate'}`,
            module: 'shops',
            targetId: id,
            reason,
        },
        () => shopService.setStatus(scopeOf(req), id, status, req.user.id),
    );
    return ok(res, after, status === 'ACTIVE' ? 'Shop activated' : 'Shop deactivated');
});

// ---- Employees ----------------------------------------------------------

const listEmployees = catchAsync(async (req, res) => {
    const query = orgValidation.employeeListSchema.parse(req.query);
    return ok(
        res,
        await employeeService.list(scopeOf(req), query),
        'Employees fetched successfully',
    );
});

const getEmployee = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    return ok(res, await employeeService.get(scopeOf(req), id), 'Employee fetched successfully');
});

const createEmployee = catchAsync(async (req, res) => {
    const data = orgValidation.createEmployeeSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'employee.create', module: 'employees'},
        async () => ({
            after: await employeeService.create(scopeOf(req), data, req.user.id),
        }),
    );
    return ok(res, after, 'Employee created successfully', httpStatus.CREATED);
});

const updateEmployee = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    const data = orgValidation.updateEmployeeSchema.parse(req.body);
    const {after} = await auditService.track(
        req,
        {action: 'employee.update', module: 'employees', targetId: id},
        () => employeeService.update(scopeOf(req), id, data),
    );
    return ok(res, after, 'Employee updated successfully');
});

// ---- Users: status and sessions (scope checked in accountService) -------

const listUsers = catchAsync(async (req, res) => {
    const query = orgValidation.userListSchema.parse(req.query);
    return ok(res, await accountService.listUsers(query), 'Users fetched successfully');
});

const setUserStatus = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    const {status, reason} = orgValidation.userStatusSchema.parse(req.body);
    const action = {ACTIVE: 'user.activate', INACTIVE: 'user.deactivate', BLOCKED: 'user.block'}[
        status
    ];
    const {after} = await auditService.track(
        req,
        {action, module: 'users', targetId: id, reason},
        () => accountService.setStatus(req.user, id, status, reason),
    );
    return ok(res, after, 'Account status updated');
});

const revokeSessions = catchAsync(async (req, res) => {
    const {id} = orgValidation.idSchema.parse(req.params);
    await auditService.track(
        req,
        {action: 'user.revokeSessions', module: 'users', targetId: id},
        async () => {
            await accountService.revokeSessions(req.user, id);
            return {};
        },
    );
    return ok(res, {}, 'All sessions of this user have been ended');
});

// ---- Dashboards and profiles -------------------------------------------

const superAdminDashboard = catchAsync(async (req, res) => {
    const byRole = await prisma.user.groupBy({
        by: ['role'],
        where: {deletedAt: null},
        _count: {_all: true},
    });
    const roleCount = (role: Role) => byRole.find((r) => r.role === role)?._count._all ?? 0;
    const [companies, branches, shops, recentCompanies, recentBranches] = await Promise.all([
        companyService.listCompanies({
            page: 1,
            limit: 1,
            search: '',
            sortBy: 'createdAt',
            sortDir: 'desc',
        }),
        branchService.counts({}),
        shopService.counts({}),
        prisma.company.findMany({
            where: {deletedAt: null},
            orderBy: {createdAt: 'desc'},
            take: 5,
            select: {id: true, name: true, code: true, city: true, status: true, createdAt: true},
        }),
        prisma.branch.findMany({
            where: {deletedAt: null},
            orderBy: {createdAt: 'desc'},
            take: 5,
            select: {
                id: true,
                name: true,
                code: true,
                city: true,
                status: true,
                createdAt: true,
                company: {select: {name: true}},
            },
        }),
    ]);
    return ok(
        res,
        {
            companies: companies.summary,
            branches: {total: branches.branches, active: branches.activeBranches},
            shops: {total: shops.shops, active: shops.activeShops},
            users: {
                companyAdmins: roleCount(Role.ADMIN),
                branchAdmins: roleCount(Role.SUB_ADMIN),
                employees: roleCount(Role.EMPLOYEE),
                customers: roleCount(Role.USER),
            },
            recentCompanies,
            recentBranches,
        },
        'Dashboard fetched successfully',
    );
});

/** Company admin and branch admin dashboards: counts in their own scope */
const scopedDashboard = catchAsync(async (req, res) => {
    const scope = scopeOf(req);
    const [counts, shopCounts, recentEmployees] = await Promise.all([
        branchService.counts(scope),
        shopService.counts(scope),
        employeeService.list(scope, {
            page: 1,
            limit: 5,
            search: '',
            sortBy: 'createdAt',
            sortDir: 'desc',
        }),
    ]);
    return ok(
        res,
        {...counts, ...shopCounts, recentEmployees: recentEmployees.items},
        'Dashboard fetched successfully',
    );
});

/** Branch admin overview: sales, purchases, stock and shops of their branch */
const branchOverview = catchAsync(async (req, res) => {
    const {companyId, branchId} = scopeOf(req);
    return ok(
        res,
        await branchOverviewService.get({companyId: companyId!, branchId: branchId!}),
        'Branch overview fetched successfully',
    );
});

const companyProfile = catchAsync(async (req, res) => {
    const {companyId} = scopeOf(req);
    return ok(res, await companyService.getCompanyById(companyId!), 'Company fetched successfully');
});

const branchProfile = catchAsync(async (req, res) => {
    const {branchId} = scopeOf(req);
    return ok(res, await branchService.ofUser(branchId!), 'Branch fetched successfully');
});

export default {
    listBranches,
    getBranch,
    branchOptions,
    createBranch,
    updateBranch,
    setBranchStatus,
    listShops,
    getShop,
    shopOptions,
    shopStats,
    createShop,
    updateShop,
    setShopStatus,
    listEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    listUsers,
    setUserStatus,
    revokeSessions,
    superAdminDashboard,
    scopedDashboard,
    branchOverview,
    companyProfile,
    branchProfile,
};
