import {z} from 'zod';
import {field} from './fieldRules';

// Same labels and rules as backend/src/validations/org.validation.ts

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = (label: string) =>
  z
    .string()
    .refine((v) => !v || TIME.test(v), `Enter a valid ${label}`)
    .optional();

const branchFields = {
  name: field({label: 'Branch Name', kind: 'text'}),
  email: field({label: 'Branch Email', kind: 'email', required: false}),
  phone: field({label: 'Contact Phone', kind: 'phone', required: false}),
  alternatePhone: field({
    label: 'Alternate Phone',
    kind: 'alternatePhone',
    required: false,
  }),
  postalCode: field({label: 'Pincode', kind: 'pincode'}),
  state: field({label: 'State', kind: 'text', max: 60}),
  district: field({label: 'District', kind: 'text', max: 60}),
  city: field({label: 'City', kind: 'text', max: 60}),
  address: field({label: 'Address', kind: 'text', max: 500}),
  openingTime: time('Opening Time'),
  closingTime: time('Closing Time'),
  weeklyHolidays: z
    .array(z.string())
    .max(6, 'A branch must be open at least one day'),
  notes: field({label: 'Notes', kind: 'text', max: 500, required: false}),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  adminName: field({label: 'Admin Full Name', kind: 'name', required: false}),
  adminEmail: field({label: 'Admin Email', kind: 'email', required: false}),
  adminPhone: field({
    label: 'Admin Phone Number',
    kind: 'phone',
    required: false,
  }),
  adminPassword: field({
    label: 'Admin Password',
    kind: 'password',
    required: false,
  }),
};

export const branchSchema = z.object(branchFields).superRefine((v, ctx) => {
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
  } as const;
  if (v.adminName || v.adminEmail || v.adminPhone || v.adminPassword) {
    (Object.keys(admin) as (keyof typeof admin)[])
      .filter((k) => !v[k])
      .forEach((k) =>
        ctx.addIssue({
          code: 'custom',
          path: [k],
          message: `${admin[k]} is required`,
        }),
      );
  }
});

export type BranchValues = z.infer<typeof branchSchema>;

export const EMPTY_BRANCH: BranchValues = {
  name: '',
  email: '',
  phone: '',
  alternatePhone: '',
  postalCode: '',
  state: '',
  district: '',
  city: '',
  address: '',
  openingTime: '',
  closingTime: '',
  weeklyHolidays: [],
  notes: '',
  status: 'ACTIVE',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
};

export const BRANCH_FIELDS = Object.keys(EMPTY_BRANCH);

const shopFields = {
  name: field({label: 'Shop Name', kind: 'text'}),
  branchId: z.string().optional(),
  email: field({label: 'Shop Email', kind: 'email', required: false}),
  phone: field({label: 'Contact Phone', kind: 'phone', required: false}),
  address: field({
    label: 'Address / Floor',
    kind: 'text',
    max: 500,
    required: false,
  }),
  gstin: field({label: 'GSTIN', kind: 'gstin', required: false}),
  // Sales bill series, e.g. WW -> WW/26-27/00001 (shop code when empty)
  billPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || /^[A-Z]{2,6}$/.test(v), {
      message: 'Bill Prefix must be 2 to 6 letters',
    })
    .optional(),
  openingTime: time('Opening Time'),
  closingTime: time('Closing Time'),
  notes: field({label: 'Notes', kind: 'text', max: 500, required: false}),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  adminName: field({label: 'Login Full Name', kind: 'name', required: false}),
  adminEmail: field({label: 'Login Email', kind: 'email', required: false}),
  adminPhone: field({
    label: 'Login Phone Number',
    kind: 'phone',
    required: false,
  }),
  adminPassword: field({
    label: 'Login Password',
    kind: 'password',
    required: false,
  }),
};

/** Company admins pick the branch; for branch admins it is their own */
export const shopSchema = (opts: {needsBranch: boolean}) =>
  z.object(shopFields).superRefine((v, ctx) => {
    if (opts.needsBranch && !v.branchId) {
      ctx.addIssue({
        code: 'custom',
        path: ['branchId'],
        message: 'Branch is required',
      });
    }
    if (v.openingTime && v.closingTime && v.closingTime <= v.openingTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['closingTime'],
        message: 'Closing Time must be after Opening Time',
      });
    }
    // Shop login: all of name / email / phone, or none
    const login = {
      adminName: 'Login Full Name',
      adminEmail: 'Login Email',
      adminPhone: 'Login Phone Number',
    } as const;
    if (v.adminName || v.adminEmail || v.adminPhone || v.adminPassword) {
      (Object.keys(login) as (keyof typeof login)[])
        .filter((k) => !v[k])
        .forEach((k) =>
          ctx.addIssue({
            code: 'custom',
            path: [k],
            message: `${login[k]} is required`,
          }),
        );
    }
  });

export type ShopValues = z.infer<ReturnType<typeof shopSchema>>;

export const EMPTY_SHOP: ShopValues = {
  name: '',
  branchId: '',
  email: '',
  phone: '',
  address: '',
  gstin: '',
  billPrefix: '',
  openingTime: '',
  closingTime: '',
  notes: '',
  status: 'ACTIVE',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
};

export const SHOP_FIELDS = Object.keys(EMPTY_SHOP);

const employeeFields = {
  fullname: field({label: 'Full Name', kind: 'name'}),
  email: field({label: 'Email', kind: 'email'}),
  phoneNumber: field({label: 'Phone Number', kind: 'phone'}),
  branchId: z.string().optional(),
  shopId: z.string().optional(),
  employeeRole: field({
    label: 'Employee Role',
    kind: 'text',
    max: 80,
    required: false,
  }),
  jobTitle: field({label: 'Job Title', kind: 'text', max: 80, required: false}),
  department: field({
    label: 'Department',
    kind: 'text',
    max: 80,
    required: false,
  }),
  joiningDate: z.string().optional(),
  permissions: z.array(z.string()),
  password: field({label: 'Password', kind: 'password', required: false}),
};

/**
 * Create needs a password. Every employee works in a shop (and the company
 * admin also picks the shop's branch). Checked per field, so an empty submit
 * shows every missing field at once.
 */
export const employeeSchema = (opts: {
  create: boolean;
  needsBranch: boolean;
  needsShop: boolean;
}) =>
  z.object({
    ...employeeFields,
    branchId: employeeFields.branchId.refine(
      (v) => !opts.needsBranch || !!v,
      'Assigned Branch is required',
    ),
    shopId: employeeFields.shopId.refine(
      (v) => !opts.needsShop || !!v,
      'Assigned Shop is required',
    ),
    password: employeeFields.password.refine(
      (v) => !opts.create || !!v,
      'Password is required',
    ),
  });

export type EmployeeValues = z.infer<ReturnType<typeof employeeSchema>>;

export const EMPTY_EMPLOYEE: EmployeeValues = {
  fullname: '',
  email: '',
  phoneNumber: '',
  branchId: '',
  shopId: '',
  employeeRole: '',
  jobTitle: '',
  department: '',
  joiningDate: '',
  permissions: [],
  password: '',
};

export const EMPLOYEE_FIELDS = Object.keys(EMPTY_EMPLOYEE);
