import {z} from 'zod';
import {field} from './custom.validation';
import {listQuerySchema} from '../utils/list';
import {PAYMENT_MODES} from './bill.validation';

// Shop counter operations: sales returns (credit notes), the cash counter
// session and shop expenses.

export const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
export const text = (label: string, max: number) => field({label, kind: 'text', max, required: false});
export const money = (label: string) =>
    z.coerce
        .number({invalid_type_error: `Enter a valid ${label}`})
        .min(0, `${label} cannot be negative`)
        .max(10_000_000, `${label} is too large`)
        .transform((v) => Math.round(v * 100) / 100);
export const positive = (label: string) =>
    money(label).refine((v) => v > 0, `${label} must be more than 0`);

export const REFUND_MODES = [...PAYMENT_MODES, 'STORE_CREDIT', 'ADJUST_DUE', 'EXCHANGE'] as const;
export const EXPENSE_CATEGORIES = [
    'Tea & refreshment',
    'Porter / Transport',
    'Packing material',
    'Rent',
    'Salary',
    'Electricity',
    'Repairs & maintenance',
    'Stationery',
    'Other',
] as const;

const openCounterSchema = z.object({openingCash: money('Opening Cash')});
const closeCounterSchema = z.object({closingCash: money('Closing Cash')});

const createExpenseSchema = z.object({
    category: z.string().optional(),
    head: z.string().optional(),
    description: z.string().optional(),
    notes: text('Notes', 500).optional(),
    amount: positive('Amount'),
    mode: z.string().optional().default('CASH'),
    paidBy: z.string().optional().default('Cash from counter'),
    date: z.string().optional(),
    expenseDate: z
        .preprocess(
            emptyToUndefined,
            z.coerce.date({invalid_type_error: 'Enter a valid Date'}).optional(),
        )
        .optional(),
    gstAmount: z.coerce.number().optional().default(0),
    photoUrl: z.string().optional().nullable(),
});

const expenseListSchema = listQuerySchema(
    ['expenseDate', 'amount', 'createdAt'] as const,
    'expenseDate',
).extend({
    from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    month: z.string().optional(),
    head: z.string().optional(),
});

const idSchema = z.object({id: z.string().uuid('Invalid ID parameter')});

export default {
    openCounterSchema,
    closeCounterSchema,
    createExpenseSchema,
    expenseListSchema,
    idSchema,
};
