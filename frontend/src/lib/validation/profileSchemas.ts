import {z} from 'zod';

const profileSchema = z.object({
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
    .string({
      required_error: 'Email is required',
    })
    .email({message: 'Invalid email address'}),

  address: z
    .string({required_error: 'Residential Address is required'})
    .min(5, {
      message: 'Residential Address must be at least 5 characters long',
    })
    .max(100, {message: 'Residential Address cannot exceed 100 characters'}),

  state: z.string({required_error: 'State is required'}),

  city: z.string({required_error: 'City is required'}),

  // //   subscriptionPlan: z.string({required_error: 'Plan is required'}),

  // //   amount: z.preprocess(
  // //     (val) => Number(val),
  // //     z
  // //       .number({required_error: 'Amount is required'})
  // //       .min(1, {message: 'Amount must be greater than 0'})
  // //       .positive({message: 'Amount must be a positive number'}),
  // //   ),

  // //   renewalAmount: z.preprocess(
  // //     (val) => Number(val),
  // //     z
  // //       .number({required_error: 'Renewal Amount is required'})
  // //       .min(1, {message: 'Renewal Amount must be greater than 0'})
  // //       .positive({message: 'Renewal Amount must be a positive number'}),
  // //   ),

  // //   startDate: z
  // //     .string({required_error: 'Start date is required'})
  // //     .regex(/^\d{4}-\d{2}-\d{2}$/, {
  // //       message: 'Invalid date format (YYYY-MM-DD)',
  // //     })
  // //     .refine(
  // //       (date) => {
  // //         const inputDate = new Date(date);
  // //         const today = new Date();
  // //         today.setHours(0, 0, 0, 0);
  // //         inputDate.setHours(0, 0, 0, 0);
  // //         // Compare the dates, ensure the input date is not before today
  // //         return inputDate >= today;
  // //       },
  // //       {message: 'Start date cannot be in the past'},
  // //     ),

  // //   expiryDate: z
  // //     .string({required_error: 'End date is required'})
  // //     .regex(/^\d{4}-\d{2}-\d{2}$/, {
  // //       message: 'Invalid date format (YYYY-MM-DD)',
  // //     })
  // //     .refine(
  // //       (date) => {
  // //         const inputDate = new Date(date);
  // //         const today = new Date();
  // //         // Compare the dates, ensure the input date is not before today
  // //         return inputDate >= today;
  // //       },
  // //       {message: 'Start date cannot be in the past'},
  // //     ),

  // // softwareLanguage: z.string({required_error: 'Software Language is required'}),

  // //   languageId: z.string({required_error: 'Language of Data is required'}),

  // //   refId: z.string({required_error: 'Referrer Id is required'}),
  imageFile: z.instanceof(FileList).refine((files) => files.length > 0, {
    message: 'At least one file is required',
  }),
  username: z.string({required_error: 'UserId is required'}),

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

export {profileSchema};
