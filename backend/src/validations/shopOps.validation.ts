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
    'Tea / Snacks',
    'Transport',
    'Salary Advance',
    'Utilities',
    'Repairs',
    'Other',
] as const;

const createSalesReturnSchema = z.object({
    salesBillId: z.string().uuid('Select a valid sales bill'),
    refundMode: z.enum(REFUND_MODES, {errorMap: () => ({message: 'Select a refund mode'})}),
    reason: text('Reason', 300),
    exchangeItems: z
        .array(
            z.object({
                variantId: z.string().uuid('Select a valid item'),
                quantity: z.coerce.number().int().min(1),
                unitPrice: money('Unit Price'),
                taxRate: z.coerce.number().default(0),
            }),
        )
        .optional(),
    items: z
        .array(
            z.object({
                salesBillItemId: z.string().uuid('Select a valid bill item'),
                quantity: z.coerce
                    .number({invalid_type_error: 'Enter a valid Quantity'})
                    .int('Quantity must be a whole number')
                    .min(1, 'Quantity must be at least 1'),
            }),
            {required_error: 'Select at least one item to return'},
        )
        .min(1, 'Select at least one item to return')
        .max(200)
        .refine(
            (list) => new Set(list.map((i) => i.salesBillItemId)).size === list.length,
            'Each bill item can be returned only once per credit note',
        ),
});

const returnListSchema = listQuerySchema(
    ['returnDate', 'returnNumber', 'totalAmount'] as const,
    'returnDate',
).extend({
    salesBillId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

const openCounterSchema = z.object({openingCash: money('Opening Cash')});
const closeCounterSchema = z.object({closingCash: money('Closing Cash')});

const createExpenseSchema = z.object({
    category: z.enum(EXPENSE_CATEGORIES, {errorMap: () => ({message: 'Select a category'})}),
    amount: positive('Amount'),
    mode: z
        .enum(PAYMENT_MODES, {errorMap: () => ({message: 'Select Cash, UPI or Card'})})
        .default('CASH'),
    expenseDate: z
        .preprocess(
            emptyToUndefined,
            z.coerce.date({invalid_type_error: 'Enter a valid Date'}).optional(),
        )
        .refine((d) => !d || d.getTime() <= Date.now() + 60_000, 'Date cannot be in the future'),
    notes: text('Notes', 300),
});

const expenseListSchema = listQuerySchema(
    ['expenseDate', 'amount', 'createdAt'] as const,
    'expenseDate',
).extend({
    from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});

const idSchema = z.object({id: z.string().uuid('Invalid ID parameter')});

export default {
    createSalesReturnSchema,
    returnListSchema,
    openCounterSchema,
    closeCounterSchema,
    createExpenseSchema,
    expenseListSchema,
    idSchema,
};
