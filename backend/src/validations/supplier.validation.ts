import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstin: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().default('Net 30'),
  openingBalance: z.number().nonnegative().default(0),
});

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  supplierName: z.string().optional(),
  billId: z.string().optional(),
  billNumber: z.string().optional(),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMode: z.string().default('NEFT / RTGS'),
  paidFrom: z.string().default('Bank - HDFC current a/c (**4417)'),
  paymentDate: z.string().optional(),
  utrChequeNo: z.string().optional(),
  tdsDeducted: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>;

