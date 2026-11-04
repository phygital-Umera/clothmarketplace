import {z} from 'zod';
import {AccountStatus, BranchStatus, Role, ShopStatus} from '@prisma/client';
import {field} from './custom.validation';
import {listQuerySchema} from '../utils/list';
import {EMPLOYEE_PERMISSIONS} from '../config/permissions';

// Branches, branch admins, shops, employees and user status. Labels match the forms.

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const WEEK_DAYS = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
] as const;

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const time = (label: string) =>
    z.preprocess(emptyToUndefined, z.string().regex(TIME, `Enter a valid ${label}`).optional());

const branchBody = z.object({
    name: field({label: 'Branch Name', kind: 'text'}),
    email: field({label: 'Branch Email', kind: 'email', required: false}),
    phone: field({label: 'Contact Phone', kind: 'phone', required: false}),
    alternatePhone: field({label: 'Alternate Phone', kind: 'alternatePhone', required: false}),
    postalCode: field({label: 'Pincode', kind: 'pincode'}),
    state: field({label: 'State', kind: 'text', max: 60}),
    district: field({label: 'District', kind: 'text', max: 60}),
    city: field({label: 'City', kind: 'text', max: 60}),
    address: field({label: 'Address', kind: 'text', max: 500}),
    openingTime: time('Opening Time'),
    closingTime: time('Closing Time'),
    weeklyHolidays: z
        .array(z.enum(WEEK_DAYS))
        .max(6, 'A branch must be open at least one day')
        .default([]),
    notes: field({label: 'Notes', kind: 'text', max: 500, required: false}),
    status: z.nativeEnum(BranchStatus).default(BranchStatus.ACTIVE),
    // Optional branch admin ("Admin") login, set up with the branch
    adminName: field({label: 'Admin Full Name', kind: 'name', required: false}),
    adminEmail: field({label: 'Admin Email', kind: 'email', required: false}),
    adminPhone: field({label: 'Admin Phone Number', kind: 'phone', required: false}),
    adminPassword: field({label: 'Admin Password', kind: 'password', required: false}),
});

type BranchShape = Partial<z.infer<typeof branchBody>>;

const branchRules = (v: BranchShape, ctx: z.RefinementCtx) => {
    if (v.openingTime && v.closingTime && v.closingTime <= v.openingTime) {
        ctx.addIssue({
            code: 'custom',
            path: ['closingTime'],
            message: 'Closing Time must be after Opening Time',
        });
    }
    // Branch admin: all of name / email / phone, or none
    const admin = {
        adminName: 'Admin Full Name',
        adminEmail: 'Admin Email',
        adminPhone: 'Admin Phone Number',
    };
    const given = Object.keys(admin).filter((k) => v[k as keyof BranchShape]);
    if (given.length || v.adminPassword) {
        Object.entries(admin)
            .filter(([k]) => !v[k as keyof BranchShape])
            .forEach(([k, label]) =>
                ctx.addIssue({code: 'custom', path: [k], message: `${label} is required`}),
            );
    }
};

const createBranchSchema = branchBody.superRefine(branchRules);
// Status changes go through /status, which asks for a reason when deactivating
const updateBranchSchema = branchBody.omit({status: true}).partial().superRefine(branchRules);

const branchListSchema = listQuerySchema(
    ['createdAt', 'name', 'code', 'city', 'status'] as const,
    'createdAt',
).extend({
    status: z.nativeEnum(BranchStatus).optional(),
    // Super admin only: filter by company
    companyId: z.string().uuid().optional(),
});

/** Deactivating needs a reason (saved in the audit log), like blocking a user */
const statusWithReason = <T extends z.EnumLike>(statuses: T) =>
    z
        .object({
            status: z.nativeEnum(statuses),
            reason: z.string().trim().max(500).optional(),
        })
        .refine((v) => v.status === 'ACTIVE' || (v.reason?.length ?? 0) >= 5, {
            message: 'Reason must be at least 5 characters',
            path: ['reason'],
        });

const branchStatusSchema = statusWithReason(BranchStatus);

const shopBody = z.object({
    name: field({label: 'Shop Name', kind: 'text'}),
    shopType: field({label: 'Shop Type', kind: 'text', max: 60, required: false}),
    // Company admins choose; for branch admins it is always their own branch
    branchId: z.preprocess(emptyToUndefined, z.string().uuid('Select a branch').optional()),
    email: field({label: 'Shop Email', kind: 'email', required: false}),
    phone: field({label: 'Contact Phone', kind: 'phone', required: false}),
    address: field({label: 'Address / Floor', kind: 'text', max: 500, required: false}),
    gstin: z.preprocess(
        (v) => (typeof v === 'string' ? v.trim().toUpperCase() || undefined : v),
        field({label: 'GSTIN', kind: 'gstin', required: false}),
    ),
    // Sales bill series, e.g. WW -> WW/26-27/00001; the shop code is used when empty
    billPrefix: z.preprocess(
        (v) => (typeof v === 'string' ? v.trim().toUpperCase() || undefined : v),
        z
            .string()
            .regex(/^[A-Z]{2,6}$/, 'Bill Prefix must be 2 to 6 letters')
            .optional(),
    ),
    openingTime: time('Opening Time'),
    closingTime: time('Closing Time'),
    notes: field({label: 'Notes', kind: 'text', max: 500, required: false}),
    status: z.nativeEnum(ShopStatus).default(ShopStatus.ACTIVE),
    // Optional shop login ("Shop Admin"), set up with the shop
    adminName: field({label: 'Login Full Name', kind: 'name', required: false}),
    adminEmail: field({label: 'Login Email', kind: 'email', required: false}),
    adminPhone: field({label: 'Login Phone Number', kind: 'phone', required: false}),
    adminPassword: field({label: 'Login Password', kind: 'password', required: false}),
});

type ShopShape = Partial<z.infer<typeof shopBody>>;

const shopRules = (v: ShopShape, ctx: z.RefinementCtx) => {
    if (v.openingTime && v.closingTime && v.closingTime <= v.openingTime) {
        ctx.addIssue({
            code: 'custom',
            path: ['closingTime'],
            message: 'Closing Time must be after Opening Time',
        });
    }
    // Shop login: name and phone together (email optional), or none
    const login = {
        adminName: 'Login Full Name',
        adminPhone: 'Login Phone Number',
    };
    const given = Object.keys(login).filter((k) => v[k as keyof ShopShape]);
    if (given.length || v.adminPassword || v.adminEmail) {
        Object.entries(login)
            .filter(([k]) => !v[k as keyof ShopShape])
            .forEach(([k, label]) =>
                ctx.addIssue({code: 'custom', path: [k], message: `${label} is required`}),
            );
    }
};

const createShopSchema = shopBody.superRefine(shopRules);
const updateShopSchema = shopBody.omit({status: true}).partial().superRefine(shopRules);

const shopListSchema = listQuerySchema(
    ['createdAt', 'name', 'code', 'status'] as const,
    'createdAt',
).extend({
    status: z.nativeEnum(ShopStatus).optional(),
    branchId: z.string().uuid().optional(),
    // Super admin only: filter by company
    companyId: z.string().uuid().optional(),
});

const shopStatusSchema = statusWithReason(ShopStatus);

const shopOptionsSchema = z.object({branchId: z.string().uuid().optional()});

const employeeBody = z.object({
    fullname: field({label: 'Full Name', kind: 'name'}),
    email: field({label: 'Email', kind: 'email'}),
    phoneNumber: field({label: 'Phone Number', kind: 'phone'}),
    // Company admins choose; for branch admins it is always their own branch
    branchId: z.preprocess(emptyToUndefined, z.string().uuid('Select a branch').optional()),
    // The shop the employee works in; it must belong to the branch
    shopId: z.preprocess(emptyToUndefined, z.string().uuid('Select a shop').optional()),
    employeeRole: field({label: 'Employee Role', kind: 'text', max: 80, required: false}),
    jobTitle: field({label: 'Job Title', kind: 'text', max: 80, required: false}),
    department: field({label: 'Department', kind: 'text', max: 80, required: false}),
    joiningDate: z.preprocess(
        emptyToUndefined,
        z.coerce.date({invalid_type_error: 'Enter a valid Joining Date'}).optional(),
    ),
    permissions: z.array(z.enum(EMPLOYEE_PERMISSIONS)).default([]),
    password: field({label: 'Password', kind: 'password', required: false}),
});

// Shop admins never send a shop (it is theirs); the service requires it for others
const createEmployeeSchema = employeeBody.extend({
    password: field({label: 'Password', kind: 'password'}),
});
const updateEmployeeSchema = employeeBody.partial();

const employeeListSchema = listQuerySchema(
    ['createdAt', 'fullname', 'employeeCode', 'joiningDate', 'status'] as const,
    'createdAt',
).extend({
    status: z.nativeEnum(AccountStatus).optional(),
    branchId: z.string().uuid().optional(),
    shopId: z.string().uuid().optional(),
});

const userListSchema = listQuerySchema(
    ['createdAt', 'fullname', 'role', 'status', 'lastLoginAt'] as const,
    'createdAt',
).extend({
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(AccountStatus).optional(),
    companyId: z.string().uuid().optional(),
});

// Deactivate and block need a reason (saved on the user and in the audit log)
const userStatusSchema = z
    .object({
        status: z.enum([AccountStatus.ACTIVE, AccountStatus.INACTIVE, AccountStatus.BLOCKED]),
        reason: z.string().trim().max(500).optional(),
    })
    .refine((v) => v.status === AccountStatus.ACTIVE || (v.reason?.length ?? 0) >= 5, {
        message: 'Reason must be at least 5 characters',
        path: ['reason'],
    });

const idSchema = z.object({id: z.string().uuid('Invalid id')});

export default {
    createBranchSchema,
    updateBranchSchema,
    branchListSchema,
    branchStatusSchema,
    createShopSchema,
    updateShopSchema,
    shopListSchema,
    shopStatusSchema,
    shopOptionsSchema,
    createEmployeeSchema,
    updateEmployeeSchema,
    employeeListSchema,
    userListSchema,
    userStatusSchema,
    idSchema,
};
