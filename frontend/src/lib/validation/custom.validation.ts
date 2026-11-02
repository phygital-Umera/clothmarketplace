import z from 'zod';

const password = z.string().refine(
  (value) => {
    if (value.length < 8) {
      return false;
    }
    if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
      return false;
    }
    return true;
  },
  {
    message:
      'Password must be at least 8 characters long and contain at least 1 letter and 1 number.',
  },
);

const emailSchema = z.string().email('Invalid email format');
const usernameSchema = z.string().min(1, 'Username is required').max(50);
const fullnameSchema = z.string().min(1, 'Full name is required').max(100);
const refreshTokenSchema = z.string().optional();
const phoneNumberSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number format')
  .min(10, 'Phone number must be 10 digits')
  .max(10, 'Phone number must be 10 digits');

export {
  password,
  emailSchema,
  usernameSchema,
  fullnameSchema,
  refreshTokenSchema,
  phoneNumberSchema,
};
