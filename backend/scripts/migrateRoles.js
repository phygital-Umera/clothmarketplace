const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Add new enum values to Postgres enum
  await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUB_ADMIN'`);
  await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'USER'`);
  console.log('Postgres enum values added.');

  // 2. Migrate existing user roles:
  // SUPERADMIN -> SUPER_ADMIN
  // COMPANY_ADMIN -> ADMIN
  // BRANCH_ADMIN -> SUB_ADMIN
  // CUSTOMER -> USER
  const superadmins = await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'SUPER_ADMIN' WHERE "role"::text = 'SUPERADMIN'`);
  const companyAdmins = await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'ADMIN' WHERE "role"::text = 'COMPANY_ADMIN'`);
  const branchAdmins = await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'SUB_ADMIN' WHERE "role"::text = 'BRANCH_ADMIN'`);
  const customers = await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'USER' WHERE "role"::text = 'CUSTOMER'`);

  // Migrate RolePermission table
  await prisma.$executeRawUnsafe(`DELETE FROM "RolePermission" WHERE "role"::text IN ('SUPERADMIN', 'COMPANY_ADMIN', 'BRANCH_ADMIN', 'CUSTOMER')`);

  console.log(`Migrated: ${superadmins} superadmins, ${companyAdmins} company admins, ${branchAdmins} branch admins, ${customers} customers.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

