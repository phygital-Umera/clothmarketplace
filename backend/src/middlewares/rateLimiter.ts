import {Request} from 'express';
import rateLimit from 'express-rate-limit';
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
