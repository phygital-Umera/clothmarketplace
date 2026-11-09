import httpStatus from 'http-status';
import {BranchStatus, Prisma, Role, ShopStatus} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {ApiError, encryptPassword} from '@utils/index';
import {listArgs, searchWhere, toListResult} from '../utils/list';
import {orgValidation} from '@validations/index';
import accountService, {Scope} from './account.service';
import branchService from './branch.service';

type CreateShop = z.infer<typeof orgValidation.createShopSchema>;
// status is only set through setStatus (the form cannot change it)
type UpdateShop = z.infer<typeof orgValidation.updateShopSchema> & {status?: ShopStatus};
type ShopList = z.infer<typeof orgValidation.shopListSchema>;

const LOGIN_FIELDS = {phone: 'adminPhone', email: 'adminEmail'};

const SHOP_LIST_INCLUDE = {
    company: {select: {id: true, name: true, code: true}},
    branch: {select: {id: true, name: true, code: true, status: true}},
    users: {
        where: {role: Role.SHOP_ADMIN, deletedAt: null},
        select: {id: true, fullname: true, email: true, phoneNumber: true, status: true},
        take: 1,
    },
    _count: {select: {users: {where: {role: Role.EMPLOYEE, deletedAt: null}}}},
} satisfies Prisma.ShopInclude;

type ShopRow = Prisma.ShopGetPayload<{include: typeof SHOP_LIST_INCLUDE}>;

/** Flatten for the API: shopAdmin + employeeCount instead of users/_count */
const present = ({users, _count, ...shop}: ShopRow) => ({
    ...shop,
    shopAdmin: users[0] ?? null,
    employeeCount: _count.users,
});

/**
 * Shops inside branches: company admin (all branches), branch admin (own
 * branch) or shop admin (own shop). A shop may have one login (Shop Admin).
 */
class ShopService {
    private scopeWhere(scope: Scope, id?: string): Prisma.ShopWhereInput {
        return {
            ...(id ? {id} : {}),
            deletedAt: null,
            ...(scope.companyId ? {companyId: scope.companyId} : {}),
            ...(scope.branchId ? {branchId: scope.branchId} : {}),
            ...(scope.shopId ? {AND: [{id: scope.shopId}]} : {}),
        };
    }

    public async list(scope: Scope, query: ShopList) {
        const where: Prisma.ShopWhereInput = {
            ...this.scopeWhere(scope),
            status: query.status,
            ...(query.branchId && !scope.branchId ? {branchId: query.branchId} : {}),
            // companyId filter only matters for the super admin (others are scoped)
            ...(query.companyId && !scope.companyId ? {companyId: query.companyId} : {}),
            OR: searchWhere(query.search, ['name', 'code', 'email', 'phone'] as const),
        };
        const [items, total, active, inactive] = await prisma.$transaction([
            prisma.shop.findMany({where, include: SHOP_LIST_INCLUDE, ...listArgs(query)}),
            prisma.shop.count({where}),
            prisma.shop.count({where: {...this.scopeWhere(scope), status: ShopStatus.ACTIVE}}),
            prisma.shop.count({where: {...this.scopeWhere(scope), status: ShopStatus.INACTIVE}}),
        ]);
        return {
            ...toListResult(items.map(present), total, query),
            summary: {total: active + inactive, active, inactive},
        };
    }

    /** 404 for shops outside the scope: no probing other companies / branches */
    public async get(scope: Scope, id: string) {
        const shop = await prisma.shop.findFirst({
            where: this.scopeWhere(scope, id),
            include: SHOP_LIST_INCLUDE,
        });
        if (!shop) throw new ApiError(httpStatus.NOT_FOUND, 'Shop not found');
        return present(shop);
    }

    /** Active shops in active branches for pickers (employee form, owner's shop picker), optionally of one branch */
    public async options(scope: Scope, branchId?: string) {
        return prisma.shop.findMany({
            where: {
                ...this.scopeWhere(scope),
                ...(branchId ? {branchId} : {}),
                status: ShopStatus.ACTIVE,
                branch: {status: BranchStatus.ACTIVE, deletedAt: null},
            },
            select: {id: true, name: true, code: true, branchId: true},
            orderBy: {name: 'asc'},
        });
    }

    /**
     * Branch admins always use their own branch; company admins pick one, or
     * get the only active branch (a new Main Branch when there is none yet)
     */
    private async resolveBranch(scope: Scope, actorId: string, requested?: string) {
        if (scope.branchId) return scope.branchId;
        if (requested) {
            await branchService.assertActiveInCompany(scope.companyId!, requested);
            return requested;
        }
        const fallback = scope.companyId
            ? await branchService.defaultBranchId(scope.companyId, actorId)
            : null;
        if (fallback) return fallback;
        throw new ApiError(httpStatus.BAD_REQUEST, 'Branch is required', [
            {field: 'branchId', message: 'Branch is required'},
        ]);
    }

    public async create(scope: Scope, data: CreateShop, actorId: string) {
        const {
            branchId: requested,
            adminName,
            adminEmail,
            adminPhone,
            adminPassword,
            ...fields
        } = data;
        const withLogin = !!adminName;
        if (withLogin && !adminPassword) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Login Password is required', [
                {field: 'adminPassword', message: 'Login Password is required'},
            ]);
        }
        if (withLogin)
            await accountService.ensureLoginIsFree(adminPhone, adminEmail, undefined, LOGIN_FIELDS);
        // After the login check: a taken phone number must not leave a new Main Branch behind
        const branchId = await this.resolveBranch(scope, actorId, requested);
        const password = adminPassword ? await encryptPassword(adminPassword) : undefined;
        const branch = await prisma.branch.findUniqueOrThrow({
            where: {id: branchId},
            select: {code: true, companyId: true},
        });

        const shop = await accountService.withRetry(
            () =>
                prisma.$transaction(async (tx) => {
                    const code = await accountService.nextCode(
                        tx,
                        `${branch.code}-S`,
                        2,
                        async (prefix) =>
                            (
                                await tx.shop.findMany({
                                    where: {code: {startsWith: prefix}},
                                    select: {code: true},
                                })
                            ).map((s) => s.code),
                    );
                    const created = await tx.shop.create({
                        data: {...fields, code, branchId, companyId: branch.companyId},
                    });
                    if (withLogin && password) {
                        await tx.user.create({
                            data: {
                                fullname: adminName!,
                                email: adminEmail,
                                phoneNumber: adminPhone!,
                                username: adminPhone,
                                password,
                                role: Role.SHOP_ADMIN,
                                companyId: branch.companyId,
                                branchId,
                                shopId: created.id,
                                isVerified: true,
                                createdById: actorId,
                            },
                        });
                    }
                    return created;
                }),
            'code',
        );
        return this.get(scope, shop.id);
    }

    public async update(scope: Scope, id: string, data: UpdateShop, actorId: string) {
        const before = await this.get(scope, id);
        const {branchId, adminName, adminEmail, adminPhone, adminPassword, ...fields} = data;
        const login = before.shopAdmin;
        // Employees' branch follows their shop, so a shop stays in its branch
        if (branchId && branchId !== before.branchId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'A shop cannot move to another branch', [
                {field: 'branchId', message: 'A shop cannot move to another branch'},
            ]);
        }
        if (adminName && !login && !adminPassword) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Login Password is required', [
                {field: 'adminPassword', message: 'Set a password to create the shop login'},
            ]);
        }
        if (adminName)
            await accountService.ensureLoginIsFree(adminPhone, adminEmail, login?.id, LOGIN_FIELDS);
        const password = adminPassword ? await encryptPassword(adminPassword) : undefined;

        await prisma.$transaction(async (tx) => {
            const updated = await tx.shop.update({where: {id}, data: fields});
            if (adminName) {
                const details = {
                    fullname: adminName,
                    email: adminEmail,
                    phoneNumber: adminPhone!,
                    username: adminPhone,
                };
                // A new password ends the sessions signed in with the old one
                const newPassword = password ? {password, refreshToken: null} : {};
                if (login) {
                    await tx.user.update({
                        where: {id: login.id},
                        data: {...details, ...newPassword},
                    });
                } else if (password) {
                    await tx.user.create({
                        data: {
                            ...details,
                            password,
                            role: Role.SHOP_ADMIN,
                            companyId: updated.companyId,
                            branchId: updated.branchId,
                            shopId: id,
                            isVerified: true,
                            createdById: actorId,
                        },
                    });
                }
            }
            // A deactivated shop: its employees are signed out
            if (updated.status !== ShopStatus.ACTIVE) {
                await tx.user.updateMany({
                    where: {shopId: id},
                    data: {refreshToken: null, sessionsRevokedAt: new Date()},
                });
            }
        });
        return {before, after: await this.get(scope, id)};
    }

    public async setStatus(scope: Scope, id: string, status: ShopStatus, actorId: string) {
        return this.update(scope, id, {status}, actorId);
    }

    /** An active shop the admin may assign employees to (employee form) */
    public async assertActiveInScope(scope: Scope, shopId: string) {
        const shop = await prisma.shop.findFirst({
            where: {...this.scopeWhere(scope, shopId), status: ShopStatus.ACTIVE},
            select: {id: true, branchId: true, branch: {select: {status: true}}},
        });
        if (!shop || shop.branch.status !== 'ACTIVE') {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Select an active shop', [
                {field: 'shopId', message: 'Select an active shop'},
            ]);
        }
        return shop;
    }

    /**
     * Branch Shops page: per-shop stock units, sales this month and the next
     * sales bill number, plus the code the next new shop will get.
     */
    public async branchStats(scope: Scope) {
        const shops = await prisma.shop.findMany({
            where: this.scopeWhere(scope),
            select: {id: true},
        });
        const ids = shops.map((s) => s.id);
        const now = new Date();
        const month = new Date(now.getFullYear(), now.getMonth(), 1);
        const billPrefix = `SB-${now.toISOString().slice(0, 10).replace(/-/g, '')}-`;
        const branch = scope.branchId
            ? await prisma.branch.findUnique({
                  where: {id: scope.branchId},
                  select: {code: true},
              })
            : null;

        const [stock, sales, todaysBills, codes] = await Promise.all([
            prisma.inventory.findMany({
                where: {
                    ...(scope.branchId ? {branchId: scope.branchId} : {}),
                    variant: {product: {shopId: {in: ids}}},
                },
                select: {physicalQty: true, variant: {select: {product: {select: {shopId: true}}}}},
            }),
            prisma.salesBill.groupBy({
                by: ['shopId'],
                where: {
                    shopId: {in: ids},
                    deletedAt: null,
                    status: 'CONFIRMED',
                    billDate: {gte: month},
                },
                _sum: {totalAmount: true},
            }),
            prisma.salesBill.findMany({
                where: {shopId: {in: ids}, billNumber: {startsWith: billPrefix}},
                select: {shopId: true, billNumber: true},
            }),
            branch
                ? prisma.shop.findMany({
                      where: {code: {startsWith: `${branch.code}-S`}},
                      select: {code: true},
                  })
                : Promise.resolve([]),
        ]);

        const lastNo = (shopId: string) =>
            todaysBills
                .filter((b) => b.shopId === shopId)
                .reduce(
                    (m, b) => Math.max(m, Number(b.billNumber.slice(billPrefix.length)) || 0),
                    0,
                );
        const prefix = branch ? `${branch.code}-S` : '';
        const maxCode = codes.reduce(
            (m, c) => Math.max(m, Number(c.code.slice(prefix.length)) || 0),
            0,
        );

        return {
            nextShopCode: branch ? `${prefix}${String(maxCode + 1).padStart(2, '0')}` : null,
            shops: Object.fromEntries(
                ids.map((id) => [
                    id,
                    {
                        stockUnits: stock
                            .filter((i) => (i.variant as any)?.product?.shopId === id)
                            .reduce((t, i) => t + Math.max(i.physicalQty, 0), 0),
                        salesMtd:
                            Math.round(
                                (sales.find((x) => x.shopId === id)?._sum.totalAmount ?? 0) * 100,
                            ) / 100,
                        nextBillNumber: `${billPrefix}${String(lastNo(id) + 1).padStart(4, '0')}`,
                    },
                ]),
            ),
        };
    }

    /** Counts used by dashboards */
    public async counts(scope: Scope) {
        const base = this.scopeWhere(scope);
        const [shops, activeShops] = await Promise.all([
            prisma.shop.count({where: base}),
            prisma.shop.count({where: {...base, status: ShopStatus.ACTIVE}}),
        ]);
        return {shops, activeShops};
    }
}

export default new ShopService();
