import {z} from 'zod';
import {field} from './custom.validation';

export const CREDIT_PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'NETBANKING', 'CHEQUE'] as const;

export const receivePaymentSchema = z.object({
  amount: z.coerce
    .number({invalid_type_error: 'Enter a valid Amount'})
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Amount is too large')
    .transform((v) => Math.round(v * 100) / 100),
  mode: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
    z.enum(CREDIT_PAYMENT_MODES, {errorMap: () => ({message: 'Select a payment mode'})}),
  ),
  date: z
    .string()
    .optional()
    .refine((d) => !d || !Number.isNaN(Date.parse(d)), 'Enter a valid date')
    .refine((d) => !d || Date.parse(d) <= Date.now() + 60_000, 'Date cannot be in the future'),
  note: field({label: 'Note', kind: 'text', max: 300, required: false}),
});

export const customerStatementQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;
export type CustomerStatementQuery = z.infer<typeof customerStatementQuerySchema>;
