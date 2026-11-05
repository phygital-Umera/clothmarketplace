import {z} from 'zod';
import {field} from './custom.validation';
import commonValidation from './common.validation';

// Login checks the password against the hash only; strength rules apply when
// a password is set, not when it is typed in
const loginUserSchema = z
    .object({
        email: z.string().trim().max(254).optional(),
        username: z.string().trim().max(254).optional(),
        password: z.string({required_error: 'Password is required'}).min(1, 'Password is required'),
    })
    .refine((v) => v.email || v.username, {
        message: 'Email or phone number is required',
        path: ['username'],
    });

/**
 * Public sign-up. Creates CUSTOMER accounts only: there is no role field,
 * and unknown fields (e.g. "role": "SUPERADMIN") are stripped by zod.
 */
const registerUserSchema = z
    .object({
        fullname: field({label: 'Full Name', kind: 'name'}),
        email: field({label: 'Email Address', kind: 'email'}),
        phoneNumber: field({label: 'Phone Number', kind: 'phone'}),
        password: field({label: 'Password', kind: 'password'}),
        confirmPassword: z.string({required_error: 'Confirm Password is required'}),
        acceptTerms: z
            .union([z.boolean(), z.enum(['true', 'false'])])
            .transform((v) => v === true || v === 'true')
            .refine((v) => v, 'You must accept the terms and conditions'),
    })
    .refine((v) => v.password === v.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current Password is required'),
        newPassword: field({label: 'New Password', kind: 'password'}),
        confirmPassword: z.string({required_error: 'Confirm Password is required'}),
        signOutOthers: z.boolean().optional(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })
    .refine((v) => v.newPassword !== v.currentPassword, {
        message: 'New Password must be different from the current one',
        path: ['newPassword'],
    });

const forgotPasswordSchema = z.object({
    identifier: z
        .string({required_error: 'Email or phone number is required'})
        .trim()
        .min(1, 'Email or phone number is required')
        .max(254),
});

const resetPasswordSchema = z
    .object({
        token: z.string().min(20, 'This reset link is invalid').max(200),
        newPassword: field({label: 'New Password', kind: 'password'}),
        confirmPassword: z.string({required_error: 'Confirm Password is required'}),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

// Profile fields: name, address, phone, posPin, photoUrl
const updateUserSchema = z.object({
    fullname: field({label: 'Full Name', kind: 'name', required: false}),
    address: field({label: 'Address', kind: 'text', max: 500, required: false}),
    phoneNumber: z.string().trim().optional(),
    posPin: z.string().trim().max(10).optional().nullable(),
    photoUrl: z.string().trim().optional().nullable(),
});

export default {
    loginUserSchema,
    registerUserSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateUserSchema,
    idSchema: commonValidation.idSchema,
};
