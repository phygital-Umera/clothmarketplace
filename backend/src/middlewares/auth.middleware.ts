import {Request, Response, NextFunction} from 'express';
import {catchAsync, ApiError} from '@utils/index';
import prisma from '../client';
import {permissionService, tokenService, userService} from '@services/index';
import {EmployeePermission, Permission} from '../config/permissions';
import httpStatus from 'http-status';
import {Role} from '@prisma/client';
import {commonValidation} from '@validations/index';

const getTokenFromRequest = (req: Request): string => {
    const token =
        req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '') || '';
    if (!token) throw new ApiError(httpStatus.UNAUTHORIZED, 'Please sign in');
    commonValidation.tokenSchema.parse(token);

    return token;
};

/**
 * Valid access token AND an account that may still use the app: a blocked
 * user, an inactive account or a suspended company loses access on the next
 * request, not when the token expires.
 */
const verifyJWT = catchAsync(async (req, res, next) => {
    const token = getTokenFromRequest(req);
    const decodedToken = tokenService.verifyToken(token, 'access');

    const user = await prisma.user.findUnique({
        where: {id: decodedToken.id},
        select: {
            id: true,
            username: true,
            email: true,
            fullname: true,
            role: true,
            phoneNumber: true,
            companyId: true,
            branchId: true,
            shopId: true,
            status: true,
            deletedAt: true,
            permissions: true,
            sessionsRevokedAt: true,
        },
    });

    if (!user || user.deletedAt) {
        throw new ApiError(
            httpStatus.UNAUTHORIZED,
            'Your session is no longer valid. Please sign in.',
        );
    }
    // Tokens issued before "revoke sessions" / block / password reset are dead
    const revokedAt = user.sessionsRevokedAt
        ? Math.floor(user.sessionsRevokedAt.getTime() / 1000)
        : 0;
    if (revokedAt && Number(decodedToken.iat ?? 0) < revokedAt) {
        throw new ApiError(
            httpStatus.UNAUTHORIZED,
            'Your session has ended. Please sign in again.',
        );
    }
    await userService.assertCanSignIn(user);

    const rolePermissions = await permissionService.getRolePermissions(user.role);
    // Employees also get the permissions their admin gave them
    const permissions =
        user.role === Role.EMPLOYEE
            ? [...new Set([...rolePermissions, ...user.permissions])]
            : rolePermissions;
    req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        phoneNumber: user.phoneNumber,
        companyId: user.companyId,
        branchId: user.branchId,
        shopId: user.shopId,
        permissions,
    };
    next();
});

const checkRole = (requiredRoles: Role | Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
        }

        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        if (!roles.includes(user.role)) {
            throw new ApiError(
                httpStatus.FORBIDDEN,
                `Access denied: Your role (${user.role}) does not have permission. Required role(s): ${roles.join(', ')}.`,
            );
        }

        next();
    };
};

/**
 * Allow the request only if the user's role has every listed permission.
 * Run after verifyJWT. The frontend hides actions too, but this is the check
 * that counts.
 */
const checkPermission = (...required: (Permission | EmployeePermission)[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
        }

        const missing = required.filter((p) => !user.permissions?.includes(p));
        if (missing.length) {
            throw new ApiError(
                httpStatus.FORBIDDEN,
                `Access denied: missing permission ${missing.join(', ')}`,
            );
        }

        next();
    };
};

const checkAdmin = checkRole(Role.ADMIN);
const checkSuperAdmin = checkRole(Role.SUPER_ADMIN);
const checkCompanyAdmin = checkRole(Role.ADMIN);
const checkBranchAdmin = checkRole(Role.SUB_ADMIN);
const checkShopAdmin = checkRole(Role.SHOP_ADMIN);
// const checkSuperAdmin = checkRole(Role.SUPER_ADMIN);
// const checkClient = checkRole(Role.CLIENT);
// const checkMaharaj = checkRole(Role.MAHARAJ);
// const checkStaff = checkRole(Role.STAFF);
// const checkVendor = checkRole(Role.VENDOR);

// const checkCaterorOrStaff = checkRole([Role.ADMIN, Role.SHOP]);

export {
    verifyJWT,
    checkRole,
    checkPermission,
    checkAdmin,
    checkSuperAdmin,
    checkCompanyAdmin,
    checkBranchAdmin,
    checkShopAdmin,
    // checkEmployee,
    // checkSuperAdmin,
    // checkClient,
    // checkMaharaj,
    // checkStaff,
    // checkVendor,
    // checkCaterorOrStaff,
};
