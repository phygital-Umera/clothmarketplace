import {z} from 'zod';

const settingSchema = z.object({
  userId: z.string({required_error: 'UserId is required'}),

  password: z
    .string({required_error: 'Password is required'})
    .min(8, {message: 'Password must be at least 8 characters long'})
    .regex(/[A-Z]/, {
      message: 'Password must contain at least one uppercase letter',
    })
    .regex(/[a-z]/, {
      message: 'Password must contain at least one lowercase letter',
    })
    .regex(/[0-9]/, {message: 'Password must contain at least one number'})
    .regex(/[@$!%*?&]/, {
      message:
        'Password must contain at least one special character (@, $, !, %, *, ?, &)',
    }),
});

export {settingSchema};
