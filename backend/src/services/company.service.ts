import {AccountStatus, CompanyStatus, Prisma, Role} from '@prisma/client';
import {z} from 'zod';
import httpStatus from 'http-status';
import prisma from '../client';
import {ApiError, encryptPassword} from '@utils/index';
import {listArgs, searchWhere, toListResult} from '../utils/list';
import accountService from './account.service';
import {companyValidation} from '@validations/index';

type CreateCompany = z.infer<typeof companyValidation.createCompanySchema>;
type UpdateCompany = z.infer<typeof companyValidation.updateCompanySchema>;
type ListCompanies = z.infer<typeof companyValidation.listCompaniesSchema>;

const STOP_WORDS = ['PVT', 'LTD', 'PRIVATE', 'LIMITED', 'LLP', 'THE', 'AND', 'CO'];

/** "Aarvi Textiles Pvt Ltd" -> "AARV-TEX" */
const codeFromName = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w && !STOP_WORDS.includes(w))
        .slice(0, 2)
        .map((w, i) => w.slice(0, i === 0 ? 4 : 3))
        .join('-') || 'COMP';

class CompanyService {
    /**
     * Unique company code from the name: AARV-TEX, then AARV-TEX-2, -3...
     * Codes of deleted companies are freed on delete, so they can be reused.
     */
    private async generateCode(name: string) {
        const base = codeFromName(name);
        const taken = await prisma.company.findMany({
            where: {code: {startsWith: base}},
            select: {code: true},
        });
        const used = new Set(taken.map((c) => c.code));
        if (!used.has(base)) return base;
        for (let n = 2; ; n++) {
            const candidate = `${base}-${n}`;
            if (!used.has(candidate)) return candidate;
        }
    }

    /** 409 under the Admin Phone / Admin Email field when already used */
    private ensureLoginIsFree(phone?: string, email?: string, exceptUserId?: string) {
        return accountService.ensureLoginIsFree(phone, email, exceptUserId, {
            phone: 'adminPhone',
            email: 'adminEmail',
        });
    }

    /** The company's admin login (one per company) */
    private adminUserOf(companyId: string) {
        return prisma.user.findFirst({
            where: {companyId, role: Role.ADMIN, deletedAt: null},
            select: {id: true},
        });
    }

    /**
     * Login fields of the company admin, kept in step with the company.
     * The account status stays separate from the company status; sign-in
     * checks the company status itself (userService.assertCanSignIn).
     */
    private adminLogin(company: {adminName: string; adminEmail: string; adminPhone: string}) {
        return {
            fullname: company.adminName,
            email: company.adminEmail,
            phoneNumber: company.adminPhone,
            username: company.adminPhone,
        };
    }

    /** Creates the company and its admin's login account together */
    public async createCompany(data: CreateCompany, logo?: string) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {removeLogo, adminPassword, ...rest} = data;
        await this.ensureLoginIsFree(rest.adminPhone, rest.adminEmail);
        const password = await encryptPassword(adminPassword);

        // Two creates with the same name at once can pick the same code;
        // the unique index rejects one of them, so try again
        for (let attempt = 0; ; attempt++) {
            const code = await this.generateCode(rest.name);
            try {
                return await prisma.$transaction(async (tx) => {
                    const company = await tx.company.create({
                        data: {...rest, code, logo: logo || null},
                    });
                    await tx.user.create({
                        data: {
                            ...this.adminLogin(company),
                            password,
                            role: Role.ADMIN,
                            companyId: company.id,
                            isVerified: true,
                        },
                    });
                    return company;
                });
            } catch (error) {
                const codeTaken =
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002' &&
                    String(error.meta?.target).includes('code');
                if (!codeTaken || attempt >= 4) throw error;
            }
        }
    }

    public async listCompanies(query: ListCompanies) {
        const {search, status} = query;
        const where: Prisma.CompanyWhereInput = {
            deletedAt: null,
            status,
            OR: searchWhere(search, ['name', 'code', 'email', 'city', 'adminName'] as const),
        };

        const [items, total, active, inactive] = await prisma.$transaction([
            prisma.company.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            branches: {where: {deletedAt: null}},
                            users: {where: {role: Role.EMPLOYEE, deletedAt: null}},
                        },
                    },
                },
                ...listArgs(query),
            }),
            prisma.company.count({where}),
            prisma.company.count({where: {deletedAt: null, status: CompanyStatus.ACTIVE}}),
            prisma.company.count({where: {deletedAt: null, status: CompanyStatus.INACTIVE}}),
        ]);

        return {
            ...toListResult(
                items.map(({_count, ...company}) => ({
                    ...company,
                    branchCount: _count.branches,
                    employeeCount: _count.users,
                })),
                total,
                query,
            ),
            summary: {total: active + inactive, active, inactive},
        };
    }

    public async getCompanyById(id: string) {
        const company = await prisma.company.findFirst({where: {id, deletedAt: null}});
        if (!company) throw new ApiError(httpStatus.NOT_FOUND, 'Company not found');
        // Lets the edit form say whether a password is already set
        return {...company, hasAdminLogin: !!(await this.adminUserOf(id))};
    }

    public async updateCompany(id: string, data: UpdateCompany, logo?: string) {
        await this.getCompanyById(id);
        const {removeLogo, adminPassword, ...rest} = data;
        const adminUser = await this.adminUserOf(id);
        await this.ensureLoginIsFree(rest.adminPhone, rest.adminEmail, adminUser?.id);
        const password = adminPassword ? await encryptPassword(adminPassword) : undefined;

        return prisma.$transaction(async (tx) => {
            const company = await tx.company.update({
                where: {id},
                data: {
                    ...rest,
                    ...(logo ? {logo} : removeLogo ? {logo: null} : {}),
                },
            });
            const login = this.adminLogin(company);
            // A new password or a company that is no longer active ends sessions
            const endSessions =
                password || company.status !== CompanyStatus.ACTIVE ? {refreshToken: null} : {};
            // New password for the admin (blank keeps the current one)
            const newPassword = password ? {password} : {};

            if (adminUser) {
                await tx.user.update({
                    where: {id: adminUser.id},
                    data: {...login, ...endSessions, ...newPassword},
                });
            } else if (password) {
                // Companies created before logins existed get one on first edit
                await tx.user.create({
                    data: {
                        ...login,
                        password,
                        role: Role.ADMIN,
                        companyId: id,
                        isVerified: true,
                    },
                });
            }
            return company;
        });
    }

    /** Returns the company as it was before deletion (for the audit log) */
    public async deleteCompany(id: string) {
        const company = await this.getCompanyById(id);
        const adminUser = await this.adminUserOf(id);
        const now = new Date();
        await prisma.$transaction([
            // Soft delete, and free the unique code so it can be reused
            prisma.company.update({
                where: {id},
                data: {deletedAt: now, code: `${id}-deleted`},
            }),
            // The admin can no longer sign in; free the phone for a new account
            ...(adminUser
                ? [
                      prisma.user.update({
                          where: {id: adminUser.id},
                          data: {
                              status: AccountStatus.INACTIVE,
                              deletedAt: now,
                              refreshToken: null,
                              phoneNumber: `deleted-${adminUser.id}`,
                          },
                      }),
                  ]
                : []),
            // Its branches go too, and every branch admin / employee is signed out
            prisma.branch.updateMany({
                where: {companyId: id, deletedAt: null},
                data: {deletedAt: now},
            }),
            prisma.user.updateMany({
                where: {companyId: id, deletedAt: null},
                data: {status: AccountStatus.INACTIVE, refreshToken: null, sessionsRevokedAt: now},
            }),
        ]);
        return company;
    }
}

export default new CompanyService();
