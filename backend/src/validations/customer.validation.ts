import {z} from 'zod';
import {field} from './custom.validation';

export const customerTypeEnum = z.enum(['Retail', 'B2B']);

const amount = (label: string) =>
  z.coerce
    .number({invalid_type_error: `Enter a valid ${label}`})
    .min(0, `${label} cannot be negative`)
    .max(10_000_000, `${label} is too large`)
    .transform((v) => Math.round(v * 100) / 100);

// Same field rules as every other form: 10-digit Indian mobile, valid GSTIN
export const createCustomerSchema = z.object({
  name: field({label: 'Customer Name', kind: 'text', max: 120}),
  mobile: field({label: 'Mobile Number', kind: 'phone'}),
  customerType: customerTypeEnum.default('Retail'),
  businessName: field({label: 'Business Name', kind: 'text', max: 120, required: false}),
  gstin: field({label: 'GSTIN', kind: 'gstin', required: false}),
  address: field({label: 'Address', kind: 'text', max: 500, required: false}),
  creditLimit: amount('Credit Limit').default(0),
  openingDue: amount('Opening Due').default(0),
  notes: field({label: 'Notes', kind: 'text', max: 500, required: false}),
});

// Opening due is set once, when the customer is added
export const updateCustomerSchema = createCustomerSchema.omit({openingDue: true}).partial();

export const customerListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  tab: z.enum(['ALL', 'WITH_DUE', 'B2B']).default('ALL').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCustomer = z.infer<typeof createCustomerSchema>;
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
