import crypto from 'crypto';
import httpStatus from 'http-status';
import {AccountStatus, BranchStatus, CompanyStatus, Prisma, Role, ShopStatus} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import {config, logger} from '@config/index';
import {ApiError, encryptPassword, isPasswordMatch} from '@utils/index';
import {userValidation} from '@validations/index';
import tokenService from './token.service';
import emailService from './email.service';
import staffService from './staff.service';

type LoginUser = z.infer<typeof userValidation.loginUserSchema>;
type RegisterUser = z.infer<typeof userValidation.registerUserSchema>;
type ChangePassword = z.infer<typeof userValidation.changePasswordSchema>;
type ResetPassword = z.infer<typeof userValidation.resetPasswordSchema>;
type UpdateUser = z.infer<typeof userValidation.updateUserSchema>;

// One message for "no such account" and "wrong password", so the login form
// cannot be used to find out which emails / phones are registered
const INVALID_CREDENTIALS = 'Invalid email/phone number or password';
const RESET_TOKEN_MINUTES = 30;

/** Fields that are safe to send to the browser (never password / tokens) */
const SAFE_USER = {
    id: true,
    fullname: true,
    username: true,
    email: true,
    phoneNumber: true,
    address: true,
    role: true,
    status: true,
    companyId: true,
    branchId: true,
    employeeCode: true,
    permissions: true,
    mustChangePassword: true,
    lastLoginAt: true,
    createdAt: true,
} satisfies Prisma.UserSelect;

type AccessCheckUser = {
    role: Role;
    status: AccountStatus;
    companyId: string | null;
    branchId?: string | null;
    shopId?: string | null;
    deletedAt: Date | null;
};

// Compared against when the account does not exist, so a missing account
// takes as long as a wrong password
let dummyHash: Promise<string> | undefined;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const isEmailConfigured = () => !!(config.email.smtp.host && config.email.from);

/** Roles whose access depends on their company being active */
const COMPANY_ROLES: Role[] = [Role.ADMIN, Role.SUB_ADMIN, Role.SHOP_ADMIN, Role.EMPLOYEE];
/** Roles whose access also depends on their branch being active */
const BRANCH_ROLES: Role[] = [Role.SUB_ADMIN, Role.SHOP_ADMIN, Role.EMPLOYEE];

class UserService {
    /**
     * Can this account use the app right now? Checked at login, at token
     * refresh and on every authenticated request (verifyJWT).
     */
    public async assertCanSignIn(user: AccessCheckUser) {
        if (user.deletedAt) throw new ApiError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);

        const statusMessages: Partial<Record<AccountStatus, string>> = {
            BLOCKED: 'This account has been blocked. Contact support.',
            INACTIVE: 'This account is inactive. Contact your administrator.',
            PENDING_INVITATION: 'This account is not set up yet. Use your invitation link first.',
        };
        const statusMessage = statusMessages[user.status];
        if (statusMessage) throw new ApiError(httpStatus.FORBIDDEN, statusMessage);

        if (COMPANY_ROLES.includes(user.role)) {
            const company = user.companyId
                ? await prisma.company.findFirst({
                      where: {id: user.companyId, deletedAt: null},
                      select: {status: true},
                  })
                : null;
            if (!company || company.status !== CompanyStatus.ACTIVE) {
                throw new ApiError(
                    httpStatus.FORBIDDEN,
                    'Your company account is not active. Contact the platform admin.',
                );
            }
        }

        if (BRANCH_ROLES.includes(user.role)) {
            const branch = user.branchId
                ? await prisma.branch.findFirst({
                      where: {id: user.branchId, companyId: user.companyId ?? '', deletedAt: null},
                      select: {status: true},
                  })
                : null;
            if (!branch || branch.status !== BranchStatus.ACTIVE) {
                throw new ApiError(
                    httpStatus.FORBIDDEN,
                    'Your branch is not active. Contact your company admin.',
                );
            }
        }

        // Shop admins, and employees placed in a shop, need that shop to be open
        const inShop =
            user.role === Role.SHOP_ADMIN || (user.role === Role.EMPLOYEE && user.shopId);
        if (inShop) {
            const shop = await prisma.shop.findFirst({
                where: {id: user.shopId ?? '', deletedAt: null},
                select: {status: true},
            });
            if (!shop || shop.status !== ShopStatus.ACTIVE) {
                throw new ApiError(
                    httpStatus.FORBIDDEN,
                    'Your shop is not active. Contact your admin.',
                );
            }
        }
    }

    public async loginUser({email, username, password}: LoginUser) {
        // Either field may hold an email or a phone number
        const identifier = (email || username || '').trim();
        const user = await prisma.user.findFirst({
            where: {
                deletedAt: null,
                OR: [
                    {phoneNumber: identifier},
                    {username: identifier},
                    {email: {equals: identifier, mode: 'insensitive'}},
                ],
            },
        });

        if (!user?.password) {
            dummyHash ??= encryptPassword(crypto.randomUUID());
            await isPasswordMatch(password, await dummyHash);
            throw new ApiError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        if (!(await isPasswordMatch(password, user.password))) {
            throw new ApiError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }

        // Only reached with the right password, so status messages reveal nothing
        await this.assertCanSignIn(user);

        const tokens = await tokenService.generateAccessAndRefreshToken({
            id: user.id,
            fullname: user.fullname,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
            role: user.role,
        });
        const profile = await prisma.user.update({
            where: {id: user.id},
            data: {lastLoginAt: new Date()},
            select: SAFE_USER,
        });
        // First sign-in of the day marks shop staff in
        await staffService.autoClockIn(user);

        return {...tokens, user: profile};
    }

    public async logoutUser(userId: string) {
        await prisma.user.update({where: {id: userId}, data: {refreshToken: null}});
    }

    public async refreshAccessToken(refreshToken: string) {
        if (!refreshToken) throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token is required');
        const decoded = tokenService.verifyToken(refreshToken, 'refresh');
        const user = await prisma.user.findUnique({where: {id: decoded.id}});

        if (!user || refreshToken !== user.refreshToken) {
            throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
        }

        await this.assertCanSignIn(user);
        await staffService.autoClockIn(user);

        return tokenService.generateAccessAndRefreshToken({
            id: user.id,
            fullname: user.fullname,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
            role: user.role,
        });
    }

    /** 409 under the field when another account already uses it */
    private async ensureContactIsFree(phoneNumber: string, email: string) {
        const errors: {field: string; message: string}[] = [];
        if (await prisma.user.findFirst({where: {phoneNumber}})) {
            errors.push({
                field: 'phoneNumber',
                message: 'This phone number already has an account',
            });
        }
        if (
            await prisma.user.findFirst({
                where: {email: {equals: email, mode: 'insensitive'}, deletedAt: null},
            })
        ) {
            errors.push({field: 'email', message: 'This email already has an account'});
        }
        if (errors.length) throw new ApiError(httpStatus.CONFLICT, errors[0].message, errors);
    }

    /** Public sign-up: always a CUSTOMER, whatever the request says */
    public async registerCustomer(data: RegisterUser) {
        await this.ensureContactIsFree(data.phoneNumber, data.email);

        return prisma.user.create({
            data: {
                fullname: data.fullname,
                email: data.email,
                phoneNumber: data.phoneNumber,
                username: data.phoneNumber,
                password: await encryptPassword(data.password),
                role: Role.USER,
                status: AccountStatus.ACTIVE,
                // No email verification yet (SMTP not set up)
                isVerified: true,
            },
            select: SAFE_USER,
        });
    }

    /** Profile of the signed-in user, with their company / branch / shop */
    public async getCurrentUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: {
                ...SAFE_USER,
                company: {select: {id: true, name: true, code: true, status: true}},
                branch: {select: {id: true, name: true, code: true, status: true}},
                shop: {select: {id: true, name: true, code: true, status: true, gstin: true}},
            },
        });
        if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
        return user;
    }

    /** Returns fresh tokens: other devices are signed out, this one stays in */
    public async changePassword(userId: string, data: ChangePassword) {
        const user = await prisma.user.findUnique({where: {id: userId}});
        if (!user?.password || !(await isPasswordMatch(data.currentPassword, user.password))) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Current Password is incorrect', [
                {field: 'currentPassword', message: 'Current Password is incorrect'},
            ]);
        }

        await prisma.user.update({
            where: {id: userId},
            data: {password: await encryptPassword(data.newPassword), mustChangePassword: false},
        });
        return tokenService.generateAccessAndRefreshToken({
            id: user.id,
            fullname: user.fullname,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
            role: user.role,
        });
    }

    /**
     * Emails a one-time reset link. Always succeeds from the caller's point of
     * view, so it cannot be used to check whether an account exists.
     */
    public async forgotPassword(identifier: string, opts: {role?: Role; resetUrl?: string} = {}) {
        const user = await prisma.user.findFirst({
            where: {
                deletedAt: null,
                status: AccountStatus.ACTIVE,
                ...(opts.role ? {role: opts.role} : {}),
                OR: [{phoneNumber: identifier}, {email: {equals: identifier, mode: 'insensitive'}}],
            },
            select: {id: true, email: true},
        });
        if (!user?.email) return;

        const resetUrl = opts.resetUrl ?? (config.frontendUrl ? `${config.frontendUrl}/reset-password` : undefined);
        const canEmail = isEmailConfigured() && !!resetUrl;
        // Without email in development, the link is written to the server log so the flow can be tried
        const logLink = !canEmail && config.env === 'development' && !!resetUrl;
        if (!canEmail && !logLink) {
            logger.warn('Password reset requested, but SMTP or the reset page URL is not configured');
            return;
        }

        const token = crypto.randomBytes(32).toString('hex');
        await prisma.user.update({
            where: {id: user.id},
            data: {
                passwordResetTokenHash: hashToken(token),
                passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
            },
        });
        if (logLink) {
            logger.info(`[dev] Password reset link for ${user.email}: ${resetUrl}?token=${token}`);
            return;
        }
        try {
            await emailService.sendResetPasswordEmail(user.email, token, resetUrl);
        } catch (error) {
            logger.error(`Reset email could not be sent: ${(error as Error).message}`);
        }
    }

    public async resetPassword({token, newPassword}: ResetPassword) {
        const user = await prisma.user.findFirst({
            where: {
                passwordResetTokenHash: hashToken(token),
                passwordResetExpiresAt: {gt: new Date()},
                deletedAt: null,
            },
            select: {id: true},
        });
        if (!user) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'This reset link is invalid or has expired');
        }

        await prisma.user.update({
            where: {id: user.id},
            data: {
                password: await encryptPassword(newPassword),
                passwordResetTokenHash: null,
                passwordResetExpiresAt: null,
                mustChangePassword: false,
                // Sign out everywhere, including tokens already issued
                refreshToken: null,
                sessionsRevokedAt: new Date(),
            },
        });
    }

    public async updateUser(userId: string, data: UpdateUser) {
        return prisma.user.update({where: {id: userId}, data, select: SAFE_USER});
    }
}

export default new UserService();
