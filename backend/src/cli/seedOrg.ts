/**
 * Seed the starting accounts: the super admin, a company with its admin, and
 * the company's branches (each with an optional branch admin).
 *
 *   npm run seed:org                        reads backend/seed.json
 *   npm run seed:org -- --file prod.json    reads another file
 *
 * Copy seed.example.json to seed.json and fill it in. seed.json is git-ignored
 * because it holds passwords. Every section (superAdmin, company, branches) is
 * optional; branches need a company.
 *
 * Safe to run again: the super admin is reset to the file's password (same
 * rules as create:superadmin), a company with the same email is reused as is,
 * and branches whose name already exists in that company are skipped.
 * Company and branch fields are checked with the same rules as the screens.
 */
import fs from 'fs';
import {Role} from '@prisma/client';
import prisma from '../client';
import {companyValidation, orgValidation} from '../validations';
import companyService from '../services/company.service';
import branchService from '../services/branch.service';
import {createSuperAdmin, SuperAdminInput} from './createSuperAdmin';

type SeedFile = {superAdmin?: SuperAdminInput; company?: unknown; branches?: unknown[]};

const main = async () => {
    const i = process.argv.indexOf('--file');
    const file = i > -1 ? process.argv[i + 1] : 'seed.json';
    if (!file || !fs.existsSync(file)) {
        throw new Error(`Seed file "${file}" not found. Copy seed.example.json to seed.json and fill it in.`);
    }
    const seed: SeedFile = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (seed.superAdmin) await createSuperAdmin(seed.superAdmin);

    if (!seed.company) {
        if (seed.branches?.length) throw new Error('"branches" need a "company" in the seed file');
        return;
    }
    const data = companyValidation.createCompanySchema.parse(seed.company);
    const existing = await prisma.company.findFirst({where: {email: data.email, deletedAt: null}});
    const company = existing ?? (await companyService.createCompany(data));
    const owner = await prisma.user.findFirstOrThrow({
        where: {companyId: company.id, role: Role.ADMIN, deletedAt: null},
        orderBy: {createdAt: 'asc'},
    });
    console.log(
        `Company ${company.name} (${company.code}) ${existing ? 'already exists' : 'created'} · admin ${owner.phoneNumber}`,
    );

    for (const raw of seed.branches ?? []) {
        const b = orgValidation.createBranchSchema.parse(raw);
        const dup = await prisma.branch.findFirst({
            where: {companyId: company.id, name: b.name, deletedAt: null},
            select: {code: true},
        });
        if (dup) {
            console.log(`Branch ${b.name} (${dup.code}) already exists, skipped`);
            continue;
        }
        const branch = await branchService.create(company.id, b, owner.id);
        console.log(`Branch ${branch.name} (${branch.code}) created${b.adminPhone ? ` · admin ${b.adminPhone}` : ''}`);
    }
};

main()
    .catch((e) => {
        // Zod and ApiError carry the per-field messages in .errors
        console.error('Seed failed:', e?.message ?? e, e?.errors ? JSON.stringify(e.errors) : '');
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
