import {z} from 'zod';

const vendorSchema = z.object({
  fullname: z
    .string({required_error: 'Full Name is required'})
    .min(3, {message: 'Name must be at least 3 characters long'}),

  phoneNumber: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val), // Ensure it's a string before processing
    z
      .string({required_error: 'Phone Number is required'}) // Use string for length validation
      .length(10, {message: 'Phone Number must contain exactly 10 digits'}) // Ensure it's 10 digits long
      .regex(/^\d+$/, {message: 'Phone Number must contain only numbers'}), // Ensure it's numeric
  ),

  address: z
    .string({required_error: 'Residential Address is required'})
    .min(5, {
      message: 'Residential Address must be at least 5 characters long',
    })
    .max(100, {message: 'Residential Address cannot exceed 100 characters'}),
});

const updatevendorSchema = z.object({
  fullname: z
    .string({required_error: 'Full Name is required'})
    .min(3, {message: 'Name must be at least 3 characters long'}),

  phoneNumber: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val), // Ensure it's a string before processing
    z
      .string({required_error: 'Phone Number is required'}) // Use string for length validation
      .length(10, {message: 'Phone Number must contain exactly 10 digits'}) // Ensure it's 10 digits long
      .regex(/^\d+$/, {message: 'Phone Number must contain only numbers'}), // Ensure it's numeric
  ),

  email: z
    .string({required_error: 'Email Address is required'})
    .email({message: 'Invalid email address'}),

  address: z
    .string({required_error: 'Residential Address is required'})
    .min(5, {
      message: 'Residential Address must be at least 5 characters long',
    })
    .max(100, {message: 'Residential Address cannot exceed 100 characters'}),

  username: z
    .string({required_error: 'Username is required'})
    .min(3, {message: 'Username must be at least 3 characters long'}),

  password: z
    .string({required_error: 'Password is required'})
    .min(3, {message: 'Password must be at least 3 characters long'}),

  isAvailable: z.string().optional(),

  category: z.string({required_error: 'Vendor Category is required'}),
});

export {vendorSchema, updatevendorSchema};

export const shareLinkSchema = z.object({
  link: z.string().min(1, 'Link is required'),
  sponsorId: z
    .string({required_error: 'Sponsor ID is required'})
    .min(5, {message: 'Sponsor ID must be at least 5 characters'}),
  selfSide: z.string(),
});
