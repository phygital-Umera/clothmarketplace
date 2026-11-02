import {z} from 'zod';

const epinSchema = z.object({
  username: z
    .string({required_error: 'Username is required'})
    .min(3, {message: 'Username must be at least 3 characters long'}),

  amount: z.preprocess(
    (val) => Number(val),
    z
      .number({required_error: 'Amount is required'})
      .min(1, {message: 'Amount must be greater than 0'})
      .positive({message: 'Amount must be a positive number'}),
  ),

  epinCount: z.preprocess(
    (val) => Number(val),
    z
      .number({required_error: 'ePIN count is required'})
      .min(1, {message: 'ePIN count must be at least 1'})
      .positive({message: 'ePIN count must be a positive number'}),
  ),

  expiryDate: z
    .string({required_error: 'Expiry date is required'})
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'Invalid date format (YYYY-MM-DD)',
    }),
});

export {epinSchema};
