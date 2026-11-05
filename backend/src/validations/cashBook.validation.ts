import {z} from 'zod';
import {field} from './custom.validation';
import {emptyToUndefined, money, positive, text} from './shopOps.validation';

// Cash book & day close of a shop counter

const dayKeySchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD)')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Enter a valid date');

const dayQuerySchema = z.object({
    date: z.preprocess(emptyToUndefined, dayKeySchema.optional()),
});

const addEntrySchema = z.object({
    type: z.enum(['IN', 'OUT'], {errorMap: () => ({message: 'Choose cash in or cash out'})}),
    amount: positive('Amount'),
    particulars: field({label: 'Particulars', kind: 'text', max: 120}),
    reference: text('Reference', 60),
});

const bankDepositSchema = z.object({
    amount: positive('Amount'),
    bankName: field({label: 'Bank', kind: 'text', max: 80}),
    reference: text('Deposit slip / UTR', 60),
});

const noteCount = z.coerce
    .number({invalid_type_error: 'Enter a valid count'})
    .int('Count must be a whole number')
    .min(0, 'Count cannot be negative')
    .max(100_000, 'Count is too large');

const closeDaySchema = z.object({
    denominations: z.record(z.enum(['500', '200', '100', '50', '20', '10', '5']), noteCount),
    depositAmount: money('Deposit'),
    keptFloat: money('Opening float'),
    differenceReason: text('Reason', 300),
});

export default {dayKeySchema, dayQuerySchema, addEntrySchema, bankDepositSchema, closeDaySchema};
