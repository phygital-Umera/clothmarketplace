-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "area" TEXT,
ADD COLUMN     "district" TEXT,
ALTER COLUMN "country" SET DEFAULT 'India';

