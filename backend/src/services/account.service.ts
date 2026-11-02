import httpStatus from 'http-status';
import {AccountStatus, Prisma, Role} from '@prisma/client';
import prisma from '../client';
import {ApiError} from '@utils/index';
import {listArgs, searchWhere, toListResult} from '../utils/list';

type Tx = Prisma.TransactionClient;
type Actor = Express.Request['user'];

/** Who the signed-in admin may manage */
export type Scope = {companyId?: string; branchId?: string; shopId?: string};

/** Fields that are safe to send to the browser (never password / tokens) */
export const SAFE_USER = {
    id: true,
    fullname: true,
    email: true,
    phoneNumber: true,
    role: true,
    status: true,
    blockedReason: true,
    companyId: true,
    branchId: true,
    shopId: true,
    employeeCode: true,
    employeeRole: true,
    jobTitle: true,
    department: true,
    joiningDate: true,
    permissions: true,
    lastLoginAt: true,
    createdAt: true,
    company: {select: {id: true, name: true, code: true}},
    branch: {select: {id: true, name: true, code: true}},
    shop: {select: {id: true, name: true, code: true}},
} satisfies Prisma.UserSelect;

/** Which roles each admin role may activate / deactivate / block */
const MANAGEABLE: Partial<Record<Role, Role[]>> = {
    SUPER_ADMIN: [Role.ADMIN, Role.SUB_ADMIN, Role.SHOP_ADMIN, Role.EMPLOYEE, Role.USER],
    ADMIN: [Role.SUB_ADMIN, Role.SHOP_ADMIN, Role.EMPLOYEE],
    SUB_ADMIN: [Role.SHOP_ADMIN, Role.EMPLOYEE],
    SHOP_ADMIN: [Role.EMPLOYEE],
};

class AccountService {
    /**
     * 409 under the form field when another account already signs in with
     * this phone or email. `fields` names the inputs on the calling form.
     */
    public async ensureLoginIsFree(
        phone: string | undefined,
        email: string | undefined,
        exceptUserId?: string,
        fields = {phone: 'phoneNumber', email: 'email'},
    ) {
        const others = exceptUserId ? {NOT: {id: exceptUserId}} : {};
        const errors: {field: string; message: string}[] = [];
        if (phone && (await prisma.user.findFirst({where: {phoneNumber: phone, ...others}}))) {
            errors.push({field: fields.phone, message: 'This phone number already has an account'});
        }
        if (
            email &&
            (await prisma.user.findFirst({
                where: {email: {equals: email, mode: 'insensitive'}, deletedAt: null, ...others},
            }))
        ) {
            errors.push({field: fields.email, message: 'This email already has an account'});
        }
        if (errors.length) throw new ApiError(httpStatus.CONFLICT, errors[0].message, errors);
    }

    /**
     * Next code in a series: AARV-TEX-B01, -B02 / AARV-TEX-E001... Unique
     * indexes back this up; callers retry on a clash (see withRetry).
     */
    public async nextCode(
        tx: Tx,
        prefix: string,
        width: number,
        existing: (prefix: string) => Promise<string[]>,
    ) {
        const used = await existing(prefix);
        const max = used.reduce(
            (m, code) => Math.max(m, Number(code.slice(prefix.length)) || 0),
            0,
        );
        return `${prefix}${String(max + 1).padStart(width, '0')}`;
    }

    /** Retry when two creates pick the same generated code at once */
    public async withRetry<T>(run: () => Promise<T>, codeField: string) {
        for (let attempt = 0; ; attempt++) {
            try {
                return await run();
            } catch (error) {
                const clash =
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002' &&
                    String(error.meta?.target).includes(codeField);
                if (!clash || attempt >= 4) throw error;
            }
        }
    }

    /** Throws 404 unless the actor may manage this user */
    private async manageable(actor: Actor, userId: string) {
        const target = await prisma.user.findFirst({
            where: {id: userId, deletedAt: null},
            select: {
                id: true,
                role: true,
                companyId: true,
                branchId: true,
                shopId: true,
                status: true,
            },
        });
        const allowedRoles = MANAGEABLE[actor.role] ?? [];
        const inScope =
            target &&
            target.id !== actor.id &&
            allowedRoles.includes(target.role) &&
            (actor.role === Role.SUPER_ADMIN ||
                (actor.role === Role.ADMIN && target.companyId === actor.companyId) ||
                (actor.role === Role.SUB_ADMIN && target.branchId === actor.branchId) ||
                (actor.role === Role.SHOP_ADMIN &&
                    !!actor.shopId &&
                    target.shopId === actor.shopId));
        // Same answer for "not found" and "not yours": no probing other companies
        if (!inScope) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
        return target;
    }

    /** Activate / deactivate / block. Leaving ACTIVE ends all sessions now. */
    public async setStatus(actor: Actor, userId: string, status: AccountStatus, reason?: string) {
        const before = await this.manageable(actor, userId);
        const now = new Date();
        const after = await prisma.user.update({
            where: {id: userId},
            data: {
                status,
                blockedReason: status === AccountStatus.ACTIVE ? null : (reason ?? null),
                blockedAt: status === AccountStatus.BLOCKED ? now : null,
                blockedById: status === AccountStatus.BLOCKED ? actor.id : null,
                ...(status === AccountStatus.ACTIVE
                    ? {}
                    : {refreshToken: null, sessionsRevokedAt: now}),
            },
            select: SAFE_USER,
        });
        return {before, after};
    }

    /** Signs the user out everywhere, including tokens already issued */
    public async revokeSessions(actor: Actor, userId: string) {
        await this.manageable(actor, userId);
        await prisma.user.update({
            where: {id: userId},
            data: {refreshToken: null, sessionsRevokedAt: new Date()},
        });
    }

    /** Super admin: every account on the platform */
    public async listUsers(query: {
        page: number;
        limit: number;
        search: string;
        sortBy: 'createdAt' | 'fullname' | 'role' | 'status' | 'lastLoginAt';
        sortDir: 'asc' | 'desc';
        role?: Role;
        status?: AccountStatus;
        companyId?: string;
    }) {
        const where: Prisma.UserWhereInput = {
            deletedAt: null,
            role: query.role,
            status: query.status,
            companyId: query.companyId,
            OR: searchWhere(query.search, [
                'fullname',
                'email',
                'phoneNumber',
                'employeeCode',
            ] as const),
        };
        const [items, total] = await prisma.$transaction([
            prisma.user.findMany({where, select: SAFE_USER, ...listArgs(query)}),
            prisma.user.count({where}),
        ]);
        return toListResult(items, total, query);
    }
}

export default new AccountService();
