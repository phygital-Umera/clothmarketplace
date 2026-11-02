import {z} from 'zod';
import {CompanyStatus} from '@prisma/client';
import {field} from './custom.validation';
import {listQuerySchema} from '../utils/list';

// Labels match the Company form, so API errors read the same as the UI.
// The company code is not here: the backend generates it on create.
const companyBodySchema = z.object({
    name: field({label: 'Company Name', kind: 'text'}),
    email: field({label: 'Company Email', kind: 'email'}),
    contactNumber: field({label: 'Contact Number', kind: 'phone'}),
    postalCode: field({label: 'Pincode', kind: 'pincode'}),
    state: field({label: 'State', kind: 'text', max: 60}),
    district: field({label: 'District', kind: 'text', max: 60}),
    city: field({label: 'City', kind: 'text', max: 60}),
    address: field({label: 'Address', kind: 'text', max: 500}),
    country: field({label: 'Country', kind: 'text', max: 60, required: false}).transform(
        (v) => v ?? 'India',
    ),
    adminName: field({label: 'Admin Full Name', kind: 'name'}),
    adminEmail: field({label: 'Admin Email', kind: 'email'}),
    adminPhone: field({label: 'Admin Phone Number', kind: 'phone'}),
    // Sign-in password for the company admin; stored hashed on their User
    adminPassword: field({label: 'Admin Password', kind: 'password'}),
    status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE),
    // Sent as "true" by the edit form to clear the existing logo
    removeLogo: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
});

const createCompanySchema = companyBodySchema;
// On edit a blank password keeps the current one
const updateCompanySchema = companyBodySchema.partial();

const COMPANY_SORT_FIELDS = ['createdAt', 'name', 'code', 'city', 'status'] as const;

const listCompaniesSchema = listQuerySchema(COMPANY_SORT_FIELDS, 'createdAt').extend({
    status: z.nativeEnum(CompanyStatus).optional(),
});

const companyIdSchema = z.object({id: z.string().uuid('Invalid company id')});

export default {
    createCompanySchema,
    updateCompanySchema,
    listCompaniesSchema,
    companyIdSchema,
};
