/**
 * Create (or reset) the super admin account.
 *
 *   npm run create:superadmin -- --phone 9876543210 --password "Str0ngPass" \
 *       --name "Platform Owner" [--email owner@clothpro.in] [--force]
 *
 * Public signup can never create a SUPER_ADMIN, so this is the only way in.
 * Running it again with the same phone resets that super admin's password.
 * It refuses to create a second super admin, or to turn another account into
 * one, unless --force is given. The password is stored hashed.
 * seed:org (seedOrg.ts) reuses createSuperAdmin().
 */
import {AccountStatus, Role} from '@prisma/client';
import prisma from '../client';
import {encryptPassword} from '../utils/encryption';
import permissionService from '../services/permission.service';

export type SuperAdminInput = {
    phone?: string;
    password?: string;
    name?: string;
    email?: string;
    force?: boolean;
};

export const createSuperAdmin = async ({
    phone: phoneNumber,
    password,
    name: fullname = 'Super Admin',
    email,
    force = false,
}: SuperAdminInput) => {
    // Email is optional: without it the super admin signs in by phone number
    if (!phoneNumber || !password) {
        throw new Error('--phone and --password are required (--email is optional)');
    }
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        throw new Error('--phone must be a 10-digit Indian mobile number');
    }

    const existing = await prisma.user.findUnique({where: {phoneNumber}});
    if (existing && existing.role !== Role.SUPER_ADMIN && !force) {
        throw new Error(
            `${phoneNumber} belongs to a ${existing.role} account. Use another phone, or --force to convert it.`,
        );
    }
    const otherSuperAdmin = await prisma.user.findFirst({
        where: {role: Role.SUPER_ADMIN, deletedAt: null, NOT: {phoneNumber}},
        select: {phoneNumber: true},
    });
    if (otherSuperAdmin && !force) {
        throw new Error(
            `A super admin already exists (${otherSuperAdmin.phoneNumber}). Run with that phone to reset it, or add --force for a second one.`,
        );
    }

    const hashed = await encryptPassword(password);
    const access = {
        status: AccountStatus.ACTIVE,
        refreshToken: null,
    };
    const user = await prisma.user.upsert({
        where: {phoneNumber},
        update: {
            email,
            fullname,
            password: hashed,
            role: Role.SUPER_ADMIN,
            companyId: null,
            ...access,
        },
        create: {
            email,
            phoneNumber,
            username: phoneNumber,
            fullname,
            password: hashed,
            role: Role.SUPER_ADMIN,
            isVerified: true,
            ...access,
        },
    });

    const granted = await permissionService.syncSuperAdmin();

    console.log(`Super admin ready: ${user.email ?? '(no email)'} / ${user.phoneNumber}`);
    console.log(`SUPER_ADMIN permissions synced (${granted} newly granted)`);
    return user;
};

const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : undefined;
};

if (require.main === module) {
    createSuperAdmin({
        phone: arg('phone') ?? process.env.SUPERADMIN_PHONE,
        password: arg('password') ?? process.env.SUPERADMIN_PASSWORD,
        name: arg('name') ?? process.env.SUPERADMIN_NAME,
        email: arg('email') ?? process.env.SUPERADMIN_EMAIL,
        force: process.argv.includes('--force'),
    })
        .catch((err) => {
            console.error(err instanceof Error ? err.message : err);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}
