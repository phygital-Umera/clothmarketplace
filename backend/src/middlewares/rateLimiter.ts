import {Request} from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import {config} from '@config/index';

const WINDOW_MS = 15 * 60 * 1000;
const common = {
    windowMs: WINDOW_MS,
    skip: () => config.env === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        statusCode: 429,
        status: false,
        message: 'Too many attempts. Please try again in 15 minutes.',
        errors: null,
    },
};

// Sign-up, password reset, support and password change: every request counts
// (they succeed for unknown emails too, so counting only failures never limits them).
// 20 per IP per 15 minutes, shared across all of these routes.
export const authLimiter = rateLimit({...common, max: 20});

/** The account a login is for, so one account's attempts do not affect another's */
const loginAccount = (req: Request) =>
    String(req.body?.username ?? req.body?.email ?? '')
        .trim()
        .toLowerCase();

// Login: 10 failed attempts per IP and account per 15 minutes. Successful logins
// do not count, and only lower the count for their own account.
export const loginLimiter = rateLimit({
    ...common,
    max: 10,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${req.ip}|${loginAccount(req)}`,
});

// Login: 50 attempts of any outcome per IP per 15 minutes, so one address
// cannot try passwords across many accounts.
export const loginIpLimiter = rateLimit({...common, max: 50});

/** Whose refresh this is (unverified; a forged token fails the check after the limiter) */
const refreshAccount = (req: Request) => {
    const token = String(req.body?.refreshToken ?? req.cookies?.refreshToken ?? '');
    const id = (jwt.decode(token) as {id?: unknown} | null)?.id;
    return typeof id === 'string' ? `user|${id}` : `ip|${req.ip}`;
};

// Token refresh: per account, not per address, since many shoppers can share
// one IP (mobile networks, a proxy) and a refused refresh signs the app out.
// An open tab refreshes about once per access-token lifetime.
export const refreshLimiter = rateLimit({...common, max: 30, keyGenerator: refreshAccount});
