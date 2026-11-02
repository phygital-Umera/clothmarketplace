-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_INVITATION', 'ACTIVE', 'INACTIVE', 'BLOCKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'BRANCH_SUB_ADMIN';
ALTER TYPE "Role" ADD VALUE 'EMPLOYEE';
ALTER TYPE "Role" ADD VALUE 'CUSTOMER';

-- AlterEnum
ALTER TYPE "CompanyStatus" ADD VALUE 'SUSPENDED';

-- AlterTable: add the new columns first
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedById" TEXT,
ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT,
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- Carry isActive over to the new status before dropping it
UPDATE "User" SET "status" = 'INACTIVE' WHERE "isActive" = false;

ALTER TABLE "User" DROP COLUMN "isActive";

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetTokenHash_key" ON "User"("passwordResetTokenHash");

