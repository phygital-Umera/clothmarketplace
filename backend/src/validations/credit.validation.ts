import { z } from 'zod';

export const receivePaymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  mode: z.string().min(1, 'Payment mode is required'),
  date: z.string().optional(),
  note: z.string().optional(),
});

export const customerStatementQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ReceivePaymentInput = z.infer<typeof receivePaymentSchema>;
export type CustomerStatementQuery = z.infer<typeof customerStatementQuerySchema>;

