import {z} from 'zod';
import dotenv from 'dotenv';
dotenv.config();
const envVarsSchema = z.object({
    NODE_ENV: z.enum(['production', 'development', 'test']),
    PORT: z.coerce.number().default(3000),
    JWT_SECRET: z.string().describe('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: z.coerce
        .number()
        .describe('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: z.coerce
        .number()
        .default(30)
        .describe('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: z.coerce
        .number()
        .default(10)
        .describe('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: z.coerce
        .number()
        .default(10)
        .describe('minutes after which verify email token expires'),
    SMTP_HOST: z.string().optional().describe('server that will send the emails'),
    SMTP_PORT: z.coerce.number().optional().describe('port to connect to the email server'),
    SMTP_USERNAME: z.string().optional().describe('username for email server'),
    SMTP_PASSWORD: z.string().optional().describe('password for email server'),
    EMAIL_FROM: z.string().optional().describe('the from field in the emails sent by the app'),
    CORS_ORIGINS: z
        .string()
        .optional()
        .describe('comma-separated list of allowed origins for CORS'),
    FRONTEND_URL: z
        .string()
        .optional()
        .describe('base URL of the frontend, used in password reset emails'),
    STORE_URL: z
        .string()
        .optional()
        .describe('base URL of the customer store, used in its password reset emails'),
    TRUST_PROXY: z
        .string()
        .optional()
        .describe('number of proxies in front of the API; empty when clients connect directly'),
    RAZORPAY_KEY_ID: z.string().optional().describe('Razorpay key id (rzp_test_... or rzp_live_...)'),
    RAZORPAY_KEY_SECRET: z.string().optional().describe('Razorpay key secret'),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional().describe('Cloudflare account id for Workers AI'),
    CLOUDFLARE_AI_API_TOKEN: z
        .string()
        .optional()
        .describe('Cloudflare API token with Workers AI permission (AI product previews)'),
    CLOUDFLARE_ACCOUNT_ID2: z
        .string()
        .optional()
        .describe('Optional second Cloudflare account, used when the first is out of its daily allowance'),
    CLOUDFLARE_AI_API_TOKEN2: z.string().optional().describe('API token for CLOUDFLARE_ACCOUNT_ID2'),
    CLOUDFLARE_AI_FOR_COLOURS: z
        .enum(['true', 'false'])
        .default('false')
        .describe('Also use Workers AI for colour photos (uses the daily allowance quickly)'),
    CLOUDFLARE_AI_PRO_MODEL: z
        .string()
        .default('@cf/black-forest-labs/flux-2-klein-9b')
        .describe('Workers AI image model for professional photos (mannequin / model)'),
    CLOUDFLARE_AI_MODEL: z
        .string()
        .default('@cf/black-forest-labs/flux-2-klein-4b')
        .describe('Workers AI image-editing model used for color previews'),
});

const parseEnvVars = () => {
    try {
        // Parse and validate process.env with the Zod schema
        const envVars = envVarsSchema.parse(process.env);
        return envVars;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Config validation error: ${error.message}`);
        } else {
            throw new Error('Config validation error: Unknown error');
        }
    }
};

const envVars = parseEnvVars();

export default {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
        verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
    },
    email: {
        smtp: {
            host: envVars.SMTP_HOST,
            port: envVars.SMTP_PORT,
            auth: {
                user: envVars.SMTP_USERNAME,
                pass: envVars.SMTP_PASSWORD,
            },
        },
        from: envVars.EMAIL_FROM,
    },
    frontendUrl: envVars.FRONTEND_URL?.replace(/\/$/, ''),
    storeUrl: envVars.STORE_URL?.replace(/\/$/, ''),
    // Only trust X-Forwarded-For when a known proxy sits in front; otherwise
    // clients could fake their IP and dodge the login rate limit
    trustProxy: envVars.TRUST_PROXY ? Number(envVars.TRUST_PROXY) : false,
    ai: {
        // Tried in order: the next account takes over when one has used today's allowance
        accounts: [
            {id: envVars.CLOUDFLARE_ACCOUNT_ID, token: envVars.CLOUDFLARE_AI_API_TOKEN, tokenVar: 'CLOUDFLARE_AI_API_TOKEN'},
            {id: envVars.CLOUDFLARE_ACCOUNT_ID2, token: envVars.CLOUDFLARE_AI_API_TOKEN2, tokenVar: 'CLOUDFLARE_AI_API_TOKEN2'},
        ].filter((a): a is {id: string; token: string; tokenVar: string} => !!(a.id?.trim() && a.token?.trim())),
        imageModel: envVars.CLOUDFLARE_AI_MODEL || '@cf/black-forest-labs/flux-2-klein-4b',
        proModel: envVars.CLOUDFLARE_AI_PRO_MODEL || '@cf/black-forest-labs/flux-2-klein-9b',
        colourWithAi: envVars.CLOUDFLARE_AI_FOR_COLOURS === 'true',
    },
    razorpay: {
        keyId: envVars.RAZORPAY_KEY_ID || undefined,
        keySecret: envVars.RAZORPAY_KEY_SECRET || undefined,
    },
    cors: {
        origins: envVars.CORS_ORIGINS
            ? envVars.CORS_ORIGINS.split(',').map((origin) => origin.trim())
            : [],
    },
};
