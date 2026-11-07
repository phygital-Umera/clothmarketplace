import httpStatus from 'http-status';
import {OrderStatus, Role} from '@prisma/client';
import {z} from 'zod';
import prisma from '../../client';
import ApiError from '@utils/ApiError';
import {config} from '@config/index';
import {field} from '../../validations/custom.validation';
import userService from '../user.service';
import {notify} from '../notification.service';

/* The customer's own account on the store: profile, help messages, password reset */

const today = () => new Date(new Date().toISOString().slice(0, 10));

export const profileSchema = z.object({
    fullname: field({label: 'Full Name', kind: 'name'}),
    email: field({label: 'Email Address', kind: 'email'}),
    alternatePhone: field({label: 'Alternate Phone', kind: 'alternatePhone', required: false}),
    gender: z.enum(['WOMAN', 'MAN', 'OTHER']).nullable().optional(),
    dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
        .transform((v) => new Date(v))
        .refine((d) => !Number.isNaN(d.getTime()), 'Enter a valid date')
        .refine((d) => d < today(), 'Date of birth must be in the past')
        .refine((d) => d.getFullYear() >= 1900, 'Enter a valid date')
        .nullable()
        .optional()
        .or(z.literal('').transform(() => null)),
});

export const SUPPORT_TOPICS = ['Order & delivery', 'Returns & refunds', 'Payments', 'Size & fit', 'My account', 'Something else'] as const;
export const supportSchema = z.object({
    name: field({label: 'Name', kind: 'name'}),
    email: field({label: 'Email Address', kind: 'email'}),
    phone: field({label: 'Phone Number', kind: 'phone', required: false}),
    topic: z.enum(SUPPORT_TOPICS, {errorMap: () => ({message: 'Choose a topic'})}),
    orderNumber: field({label: 'Order number', kind: 'text', max: 40, required: false}),
    message: field({label: 'Message', kind: 'text', max: 1500}),
});

const PROFILE = {
    id: true,
    fullname: true,
    email: true,
    phoneNumber: true,
    secondaryPhoneNumber: true,
    gender: true,
    dateOfBirth: true,
    createdAt: true,
    lastLoginAt: true,
} as const;

class StoreAccountService {
    public async profile(userId: string) {
        const [user, orders, delivered, wishlist, reviews, unread] = await Promise.all([
            prisma.user.findUniqueOrThrow({where: {id: userId}, select: PROFILE}),
            prisma.order.count({where: {customerId: userId}}),
            prisma.order.count({where: {customerId: userId, status: OrderStatus.DELIVERED}}),
            prisma.wishlistItem.count({where: {userId}}),
            prisma.productReview.count({where: {userId}}),
            prisma.notification.count({where: {userId, readAt: null}}),
        ]);
        return {
            ...user,
            alternatePhone: user.secondaryPhoneNumber,
            stats: {orders, delivered, wishlist, reviews, unread},
        };
    }

    public async updateProfile(userId: string, data: z.infer<typeof profileSchema>) {
        const taken = await prisma.user.findFirst({
            where: {id: {not: userId}, deletedAt: null, email: {equals: data.email, mode: 'insensitive'}},
            select: {id: true},
        });
        if (taken) {
            throw new ApiError(httpStatus.CONFLICT, 'This email is used by another account', [
                {field: 'email', message: 'This email is used by another account'},
            ]);
        }
        const me = await prisma.user.findUniqueOrThrow({where: {id: userId}, select: {phoneNumber: true, email: true}});
        if (data.alternatePhone && data.alternatePhone === me.phoneNumber) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Alternate phone must differ from your login number', [
                {field: 'alternatePhone', message: 'Alternate phone must differ from your login number'},
            ]);
        }
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: {id: userId},
                data: {
                    fullname: data.fullname,
                    email: data.email,
                    secondaryPhoneNumber: data.alternatePhone ?? null,
                    gender: data.gender ?? null,
                    dateOfBirth: data.dateOfBirth ?? null,
                },
            });
            if ((me.email ?? '').toLowerCase() !== data.email.toLowerCase()) {
                await notify(tx, userId, {
                    type: 'ACCOUNT',
                    title: 'Email updated',
                    body: `Your account email is now ${data.email}. If you did not do this, change your password.`,
                    link: '/account/profile',
                });
            }
        });
        return this.profile(userId);
    }

    /** Password changed from the profile page: also leaves a note in notifications */
    public async passwordChanged(userId: string) {
        await notify(prisma, userId, {
            type: 'ACCOUNT',
            title: 'Password changed',
            body: 'Your password was changed. If this was not you, reset it now from Sign in › Forgot password.',
            link: '/account/profile',
        });
    }

    public async support(userId: string | null, data: z.infer<typeof supportSchema>) {
        const req = await prisma.supportRequest.create({data: {...data, userId}});
        return {id: req.id, ticket: `HLP-${req.id.slice(0, 6).toUpperCase()}`};
    }

    /** Customers only; the link opens the store's reset page */
    public async forgotPassword(identifier: string) {
        await userService.forgotPassword(identifier, {
            role: Role.USER,
            resetUrl: config.storeUrl ? `${config.storeUrl}/reset-password` : undefined,
        });
    }
}

export default new StoreAccountService();
