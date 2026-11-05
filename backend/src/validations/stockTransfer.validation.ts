import {z} from 'zod';
import {emptyToUndefined, text} from './shopOps.validation';

// Stock transfer between the shops of a branch

export const TRANSFER_REASONS = [
    'Low stock',
    'Customer order',
    'Festival / season demand',
    'Display / new arrivals',
    'Balancing slow stock',
    'Other',
] as const;

export const TRANSFER_STATUSES = [
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'DISPATCHED',
    'RECEIVED',
    'SHORT',
] as const;

const qty = (label: string, min = 1) =>
    z.coerce
        .number({invalid_type_error: `Enter a valid ${label}`})
        .int(`${label} must be a whole number`)
        .min(min, `${label} must be at least ${min}`)
        .max(100_000, `${label} is too large`);

const uuidOrNull = z.preprocess(
    (v) => (v === '' || v === 'ANY' ? null : v),
    z.string().uuid('Select a valid shop').nullable().default(null),
);

const createTransferSchema = z.object({
    fromShopId: uuidOrNull,
    neededBy: z.preprocess(
        emptyToUndefined,
        z.coerce
            .date({invalid_type_error: 'Enter a valid date'})
            .optional()
            .refine((d) => {
                if (!d) return true;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return d.getTime() >= today.getTime();
            }, 'Needed-by date cannot be in the past'),
    ),
    reason: z.enum(TRANSFER_REASONS, {errorMap: () => ({message: 'Select a reason'})}),
    note: text('Note', 300),
    items: z
        .array(z.object({variantId: z.string().uuid('Select a valid item'), qty: qty('Quantity')}), {
            required_error: 'Add at least one item',
        })
        .min(1, 'Add at least one item')
        .max(200, 'Too many items in one request')
        .refine(
            (list) => new Set(list.map((i) => i.variantId)).size === list.length,
            'Each item can be added only once',
        ),
});

const shopListSchema = z.object({
    tab: z.preprocess(emptyToUndefined, z.enum(['MINE', 'DISPATCH', 'HISTORY']).optional()),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
});

const branchListSchema = z.object({
    tab: z.preprocess(
        emptyToUndefined,
        z.enum(['ALL', 'TO_APPROVE', 'TO_DISPATCH', 'IN_TRANSIT', 'DONE']).optional(),
    ),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
});

const variantSearchSchema = z.object({
    search: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
});

const receiveSchema = z.object({
    items: z
        .array(z.object({itemId: z.string().uuid(), receivedQty: qty('Received quantity', 0)}))
        .min(1, 'Count at least one item'),
    note: text('Note', 300),
});

const decideSchema = z
    .object({
        decision: z.enum(['APPROVE', 'REJECT']),
        fromShopId: z.preprocess(emptyToUndefined, z.string().uuid('Select a shop').optional()),
        items: z
            .array(z.object({itemId: z.string().uuid(), approvedQty: qty('Approved quantity', 0)}))
            .optional(),
        reason: text('Reason', 300),
    })
    .superRefine((v, ctx) => {
        if (v.decision === 'REJECT' && (v.reason?.length ?? 0) < 3) {
            ctx.addIssue({code: 'custom', path: ['reason'], message: 'Give a reason for rejecting'});
        }
    });

const idSchema = z.object({id: z.string().uuid('Invalid ID parameter')});

export default {
    createTransferSchema,
    shopListSchema,
    branchListSchema,
    variantSearchSchema,
    receiveSchema,
    decideSchema,
    idSchema,
};
