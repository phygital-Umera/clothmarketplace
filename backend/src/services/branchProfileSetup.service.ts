import httpStatus from 'http-status';
import {AccountStatus, Role} from '@prisma/client';
import {z} from 'zod';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {field} from '../validations/custom.validation';
import {WEEK_DAYS} from '../validations/org.validation';
import {BranchScope} from './customerDue.service';

/*
 * The branch admin's own branch, from the Branch row. Name, code and status
 * are the Company Admin's; the branch admin keeps contact details and opening
 * hours up to date.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = (label: string) =>
    z.preprocess(
        (v) => (v === '' ? undefined : v),
        z.string().regex(TIME, `Enter a valid ${label}`).optional(),
    );

export const updateProfileSchema = z
    .object({
        email: field({label: 'Branch Email', kind: 'email', required: false}),
        phone: field({label: 'Contact Phone', kind: 'phone', required: false}),
        alternatePhone: field({label: 'Alternate Phone', kind: 'alternatePhone', required: false}),
        address: field({label: 'Address', kind: 'text', max: 500}),
        city: field({label: 'City', kind: 'text', max: 60}),
        district: field({label: 'District', kind: 'text', max: 60}),
        state: field({label: 'State', kind: 'text', max: 60}),
        postalCode: field({label: 'Pincode', kind: 'pincode'}),
        openingTime: time('Opening Time'),
        closingTime: time('Closing Time'),
        weeklyHolidays: z.array(z.enum(WEEK_DAYS)).max(6, 'The branch must be open at least one day'),
    })
    .refine((v) => !v.openingTime || !v.closingTime || v.closingTime > v.openingTime, {
        message: 'Closing Time must be after Opening Time',
        path: ['closingTime'],
    });

class BranchProfileSetupService {
    public async getProfile(scope: BranchScope) {
        const branch = await prisma.branch.findFirst({
            where: {id: scope.branchId, companyId: scope.companyId, deletedAt: null},
            include: {company: {select: {name: true}}},
        });
        if (!branch) throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');

        const [shops, employees] = await Promise.all([
            prisma.shop.count({where: {branchId: branch.id, deletedAt: null}}),
            prisma.user.count({
                where: {
                    branchId: branch.id,
                    role: Role.EMPLOYEE,
                    deletedAt: null,
                    status: {not: AccountStatus.INACTIVE},
                },
            }),
        ]);

        return {
            identity: {branchName: branch.name, branchCode: branch.code, company: branch.company.name},
            contact: {
                email: branch.email ?? '',
                phone: branch.phone ?? '',
                alternatePhone: branch.alternatePhone ?? '',
                address: branch.address,
                city: branch.city,
                district: branch.district,
                state: branch.state,
                postalCode: branch.postalCode,
            },
            hours: {
                openingTime: branch.openingTime ?? '',
                closingTime: branch.closingTime ?? '',
                weeklyHolidays: branch.weeklyHolidays,
            },
            glance: {
                shops,
                employees,
                branchOpened: branch.createdAt.toISOString(),
                status: branch.status,
            },
        };
    }

    public async updateProfile(scope: BranchScope, data: z.infer<typeof updateProfileSchema>) {
        const {count} = await prisma.branch.updateMany({
            where: {id: scope.branchId, companyId: scope.companyId, deletedAt: null},
            data: {
                ...data,
                email: data.email ?? null,
                phone: data.phone ?? null,
                alternatePhone: data.alternatePhone ?? null,
                openingTime: data.openingTime ?? null,
                closingTime: data.closingTime ?? null,
            },
        });
        if (!count) throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
        return {success: true, message: 'Branch profile saved'};
    }
}

export default new BranchProfileSetupService();
