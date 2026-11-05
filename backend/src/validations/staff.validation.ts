import {z} from 'zod';
import {EMPLOYEE_PERMISSIONS} from '../config/permissions';
import {field} from './custom.validation';
import {emptyToUndefined, text} from './shopOps.validation';
import cashBookValidation from './cashBook.validation';

// Shop staff: rights, shifts, attendance and new-staff requests

export const SHIFTS = ['FULL_DAY', 'MORNING', 'EVENING'] as const;
export const ATTENDANCE_STATUSES = ['IN', 'OUT', 'LEAVE', 'ABSENT'] as const;
export const STAFF_ROLES = [
    'Cashier',
    'Sales associate',
    'Stock keeper',
    'Tailor',
    'Helper',
    'Shop manager',
] as const;

const shift = z.enum(SHIFTS, {errorMap: () => ({message: 'Select a shift'})});

const staffListSchema = z.object({
    date: z.preprocess(emptyToUndefined, cashBookValidation.dayKeySchema.optional()),
});

const updateRightsSchema = z.object({
    permissions: z.array(z.enum(EMPLOYEE_PERMISSIONS)).max(50),
});

const updateShiftSchema = z.object({shift});

const attendanceSchema = z.object({
    status: z.enum(ATTENDANCE_STATUSES, {errorMap: () => ({message: 'Select a status'})}),
    note: text('Note', 200),
});

const createStaffRequestSchema = z.object({
    fullname: field({label: 'Full Name', kind: 'name'}),
    phoneNumber: field({label: 'Phone Number', kind: 'phone'}),
    email: field({label: 'Email', kind: 'email', required: false}),
    employeeRole: z.enum(STAFF_ROLES, {errorMap: () => ({message: 'Select a role'})}),
    shift,
    permissions: z.array(z.enum(EMPLOYEE_PERMISSIONS)).max(50).default([]),
    note: text('Note', 300),
});

// Branch admin adds staff to one of its shops (created on approval)
const branchInviteSchema = createStaffRequestSchema.extend({
    shopId: z.string({required_error: 'Select a shop'}).uuid('Select a shop'),
});

const staffRequestListSchema = z.object({
    status: z.preprocess(
        emptyToUndefined,
        z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    ),
});

const decideStaffRequestSchema = z
    .object({
        decision: z.enum(['APPROVE', 'REJECT']),
        // Temporary password for the new login (approve only)
        password: field({label: 'Password', kind: 'password', required: false}),
        note: text('Note', 300),
    })
    .superRefine((v, ctx) => {
        if (v.decision === 'APPROVE' && !v.password) {
            ctx.addIssue({
                code: 'custom',
                path: ['password'],
                message: 'Set a temporary password for the new staff login',
            });
        }
        if (v.decision === 'REJECT' && (v.note?.length ?? 0) < 3) {
            ctx.addIssue({code: 'custom', path: ['note'], message: 'Give a reason'});
        }
    });

const idSchema = z.object({id: z.string().uuid('Invalid ID parameter')});

export default {
    staffListSchema,
    updateRightsSchema,
    updateShiftSchema,
    attendanceSchema,
    createStaffRequestSchema,
    branchInviteSchema,
    staffRequestListSchema,
    decideStaffRequestSchema,
    idSchema,
};
