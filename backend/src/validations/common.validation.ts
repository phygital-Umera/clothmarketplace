import {z} from 'zod';

const idSchema = z.string();
const nameSchema = z.string().min(1, 'Name is required.');
const tokenSchema = z.string().min(1, 'Token is required for authentication');
const refreshTokenSchema = z.string().optional();
const phoneNumberSchema = z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number format')
    .length(10, 'Phone number must be exactly 10 digits');
const paginationSchema = z.object({
    page: z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => val >= 1, {message: 'Page must be greater than 0'})
        .default('1'),
    limit: z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => val >= 1, {message: 'Limit must be greater than 0'})
        .default('10'),
});

const searchSchema = z.object({
    searchTerm: z.string().optional().default(''),
});

const paginationAndSearchSchema = paginationSchema.merge(searchSchema);

export default {
    idSchema,
    nameSchema,
    tokenSchema,
    paginationSchema,
    phoneNumberSchema,
    searchSchema,
    paginationAndSearchSchema,
    refreshTokenSchema,
};
