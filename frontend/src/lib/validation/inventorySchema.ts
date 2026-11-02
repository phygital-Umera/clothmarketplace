import {z} from 'zod';

export const incomeheadSchema = z.object({
  quantity: z
    .string({required_error: 'Full Name is required'})
    .min(3, {message: 'Name must be at least 3 characters long'}),
});
