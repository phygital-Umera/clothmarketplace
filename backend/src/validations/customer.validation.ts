import {z} from 'zod';

export const customerTypeEnum = z.enum(['Retail', 'B2B']);

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(5, 'Valid mobile number is required'),
  customerType: customerTypeEnum.default('Retail'),
  businessName: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  creditLimit: z.coerce.number().min(0).default(0),
  openingDue: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerListQuerySchema = z.object({
  search: z.string().optional(),
  q: z.string().optional(),
  tab: z.enum(['ALL', 'WITH_DUE', 'B2B']).default('ALL').optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateCustomer = z.infer<typeof createCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

