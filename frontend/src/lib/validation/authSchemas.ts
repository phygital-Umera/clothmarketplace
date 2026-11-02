import {z} from 'zod';
import {
  emailSchema,
  fullnameSchema,
  password,
  phoneNumberSchema,
  usernameSchema,
} from './custom.validation';

const signInValidationSchema = z.object({
  identifier: z
    .string({required_error: 'Email or mobile number is required'})
    .trim()
    .min(1, {message: 'Email or mobile number is required'}),
  // Only checked against the stored hash; strength rules apply when set
  password: z
    .string({required_error: 'Password is required'})
    .min(1, {message: 'Password is required'}),
});

const signUpValidationSchema = z.object({
  fullname: z
    .string({required_error: 'Name is required'})
    .min(2, {message: 'Name must be at least 2 characters long'}),
  username: z
    .string({required_error: 'Username is required'})
    .min(2, {message: 'Username must be at least 2 characters long'}),
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email({message: 'Invalid email address'}),
  password: z
    .string({required_error: 'Password is required'})
    .min(1, {message: 'Password is required'}),
  phoneNumber: z
    .string({required_error: 'Phone number is required'})
    .min(10, {message: 'Phone number must be at least 10 characters long'}),
});

const registerUserSchema = z.object({
  fullname: fullnameSchema.trim(),
  email: emailSchema.trim(),
  username: usernameSchema.trim(),
  password: password,
  phoneNumber: phoneNumberSchema.trim(),
});

export {signInValidationSchema, signUpValidationSchema, registerUserSchema};
