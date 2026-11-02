import {z} from 'zod';

const incomeheadSchema = z.object({
  head: z
    .string({required_error: 'Full Name is required'})
    .min(3, {message: 'Name must be at least 3 characters long'}),

  incomeExpenditure: z.string({
    required_error: 'Income/Expenditure is required',
  }),
});

const dateInFuture = (message: string) =>
  z.coerce.date().refine((date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date >= now;
  }, message);

const incomeSchema = z.object({
  eventId: z.string().optional(),
  status: z.enum(['INCOME', 'EXPENDITURE', 'PAYABLE', 'RECEIVABLE']),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  particular: z
    .string({required_error: 'Particular is required'})
    .min(3, {message: 'Particular must be at least 3 characters long'}),

  amount: z.coerce.number().min(1, {message: 'Amount must be greater than 0'}),
});

const updateIncomeSchema = incomeSchema
  .extend({
    id: z.string().min(1, 'Income expense id is required'),
  })
  .partial();

export {incomeheadSchema, incomeSchema, updateIncomeSchema};
