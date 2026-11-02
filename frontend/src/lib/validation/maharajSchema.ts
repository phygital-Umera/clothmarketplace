import {z} from 'zod';

const maharajSchema = z
  .object({
    fullname: z
      .string({required_error: 'Full Name is required'})
      .min(3, {message: 'Name must be at least 3 characters long'}),

    phoneNumber: z
      .string({required_error: 'Phone Number is required'})
      .length(10, {message: 'Phone Number must contain exactly 10 digits'})
      .regex(/^\d+$/, {message: 'Phone Number must contain only numbers'}),

    address: z
      .string({required_error: 'Residential Address is required'})
      .min(5, {
        message: 'Residential Address must be at least 5 characters long',
      })
      .max(100, {message: 'Residential Address cannot exceed 100 characters'}),

    specialization: z
      .string({required_error: 'Specialization is required'})
      .transform((val) => val.split(',').map((s) => s.trim())) // Splits by commas and trims whitespace
      .refine((arr) => Array.isArray(arr) && arr.every((s) => s.length >= 3), {
        message: 'Each specialization must be at least 3 characters long',
      }),

    experience: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({required_error: 'Experience is required'})
        .min(0, {message: 'Experience must be a positive number'}),
    ),

    email: z
      .string({required_error: 'Email is required'})
      .email({message: 'Invalid email format'}),
  })
  .transform((data) => ({
    ...data,
    username: data.phoneNumber, // Store phoneNumber as username
    password: data.phoneNumber, // Store phoneNumber as password
  }));

// Update Schema
const updatemaharajSchema = z
  .object({
    specialization: z
      .string({required_error: 'Specialization is required'})
      .min(3, {
        message: 'Each specialization must be at least 3 characters long',
      })
      .transform((val) => val.split(',').map((s) => s.trim()))
      .refine((arr) => arr.every((s) => s.length >= 3), {
        message: 'Each specialization must be at least 3 characters long',
      }),

    experience: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({required_error: 'Experience is required'})
        .min(0, {message: 'Experience must be a positive number'}),
    ),

    phoneNumber: z
      .string()
      .length(10, {message: 'Phone Number must contain exactly 10 digits'})
      .regex(/^\d+$/, {message: 'Phone Number must contain only numbers'})
      .optional(), // Optional for updates
  })
  .transform((data) => ({
    ...data,
    email: data.phoneNumber, // Store phoneNumber as username during update
    password: data.phoneNumber, // Store phoneNumber as password during update
  }));

export {maharajSchema, updatemaharajSchema};
