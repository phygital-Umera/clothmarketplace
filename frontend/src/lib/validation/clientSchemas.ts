import {z} from 'zod';

const clientValidationSchema = z
  .object({
    fullname: z
      .string({required_error: 'Name is required'})
      .min(2, {message: 'Name must be at least 2 characters long'}),
    phoneNo: z
      .string({required_error: 'Phone number is required'})
      .min(10, {message: 'Phone number must be at least 10 characters long'}),
    secondaryPhoneNo: z.string().optional(),
    email: z.string().email().optional(),
    username: z.string({required_error: 'username is required'}).optional(),
    address: z
      .string({required_error: 'address is required'})
      .min(2, {message: 'address is required'}),
    caste: z.string({required_error: 'caste is required'}).optional(),
  })
  .transform((data) => ({
    ...data,
    username: data.phoneNo,
  }));

const updateClientValidationSchema = z.object({
  fullname: z
    .string({required_error: 'Name is required'})
    .min(2, {message: 'Name must be at least 2 characters long'}),
  phoneNo: z
    .string({required_error: 'Phone number is required'})
    .min(10, {message: 'Phone number must be at least 10 characters long'}),
  secondaryPhoneNo: z
    .string({required_error: 'Secondary phone number is required'})
    .min(10, {
      message: 'Secondary phone number must be at least 10 characters long',
    })
    .optional(),
  email: z
    .string({required_error: 'Email is required'})
    .min(3, {message: 'Email must be at least 3 characters long'})
    .email({message: 'Invalid email address'}),
  address: z
    .string({required_error: 'address is required'})
    .min(2, {message: 'address is required'}),
  caste: z
    .string({required_error: 'caste is required'})
    .min(2, {message: 'caste is required'}),
});

export {clientValidationSchema, updateClientValidationSchema};
