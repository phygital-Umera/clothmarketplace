import {z} from 'zod';
import {field} from './custom.validation';

const amount = (label: string) =>
  z.coerce
    .number({invalid_type_error: `Enter a valid ${label}`})
    .min(0, `${label} cannot be negative`)
    .max(10_000_000, `${label} is too large`)
    .transform((v) => Math.round(v * 100) / 100);

export const createSupplierSchema = z.object({
  name: field({label: 'Supplier Name', kind: 'text', max: 120}),
  contactPerson: field({label: 'Contact Person', kind: 'name', required: false}),
  phone: field({label: 'Phone', kind: 'phone', required: false}),
  email: field({label: 'Email', kind: 'email', required: false}),
  gstin: field({label: 'GSTIN', kind: 'gstin', required: false}),
  city: field({label: 'City', kind: 'text', max: 60, required: false}),
  state: field({label: 'State', kind: 'text', max: 60, required: false}),
  address: field({label: 'Address', kind: 'text', max: 500, required: false}),
  paymentTerms: field({label: 'Payment Terms', kind: 'text', max: 40, required: false}).transform(
    (v) => v ?? 'Net 30',
  ),
  openingBalance: amount('Opening Balance').default(0),
});

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string({required_error: 'Supplier is required'}).uuid('Select a supplier'),
  // Pay against one open bill, or leave empty for an on-account payment
  billId: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  billNumber: z.string().trim().max(40).optional(),
  amount: amount('Amount').refine((v) => v > 0, 'Payment amount must be greater than 0'),
  paymentMode: field({label: 'Payment Mode', kind: 'text', max: 40}),
  paidFrom: field({label: 'Paid From', kind: 'text', max: 80, required: false}),
  paymentDate: z
    .string()
    .optional()
    .refine((d) => !d || !Number.isNaN(Date.parse(d)), 'Enter a valid date')
    .refine((d) => !d || Date.parse(d) <= Date.now() + 60_000, 'Date cannot be in the future'),
  utrChequeNo: field({label: 'UTR / Cheque No', kind: 'text', max: 60, required: false}),
  tdsDeducted: amount('TDS').default(0),
  notes: field({label: 'Notes', kind: 'text', max: 500, required: false}),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>;
