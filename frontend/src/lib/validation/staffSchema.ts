import {z} from 'zod';

const staffSchema = z.object({
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

  jobTitle: z
    .string({required_error: 'Job Title is required'})
    .min(3, {message: 'Job Title must be at least 3 characters long'}),

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
});

const updatestaffSchema = z.object({
  jobTitle: z
    .string({required_error: 'Job Title is required'})
    .min(3, {message: 'Job Title must be at least 3 characters long'}),

  address: z
    .string({required_error: 'Residential Address is required'})
    .min(5, {
      message: 'Residential Address must be at least 5 characters long',
    })
    .max(100, {message: 'Residential Address cannot exceed 100 characters'}),
});
export {staffSchema, updatestaffSchema};
