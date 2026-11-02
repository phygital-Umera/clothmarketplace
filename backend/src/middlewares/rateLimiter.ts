import rateLimit from 'express-rate-limit';
import {config} from '@config/index';

// Login / sign-up / password reset: 20 failed attempts per IP per 15 minutes.
// Successful requests do not count.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    skip: () => config.env === 'test',
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        statusCode: 429,
        status: false,
        message: 'Too many attempts. Please try again in 15 minutes.',
        errors: null,
    },
});
