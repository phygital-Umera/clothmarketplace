-- The credit-payment table was created with column names that do not match
-- schema.prisma (paymentMode/notes/createdById, no companyId/branchId), so every
-- Credit / Udhaar query failed. Rename and backfill, keeping existing rows.
-- Written to be safe on databases where some of these columns already match.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'CustomerCreditPayment' AND column_name = 'paymentMode')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'CustomerCreditPayment' AND column_name = 'mode') THEN
        ALTER TABLE "CustomerCreditPayment" RENAME COLUMN "paymentMode" TO "mode";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'CustomerCreditPayment' AND column_name = 'notes')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'CustomerCreditPayment' AND column_name = 'note') THEN
        ALTER TABLE "CustomerCreditPayment" RENAME COLUMN "notes" TO "note";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'CustomerCreditPayment' AND column_name = 'createdById')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'CustomerCreditPayment' AND column_name = 'receivedById') THEN
        ALTER TABLE "CustomerCreditPayment" RENAME COLUMN "createdById" TO "receivedById";
    END IF;
END $$;

ALTER TABLE "CustomerCreditPayment" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'CASH';
ALTER TABLE "CustomerCreditPayment" ALTER COLUMN "mode" DROP DEFAULT;
ALTER TABLE "CustomerCreditPayment" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "CustomerCreditPayment" ADD COLUMN IF NOT EXISTS "receivedById" TEXT;
ALTER TABLE "CustomerCreditPayment" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "CustomerCreditPayment" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- Backfill company and branch from the shop the payment was taken in
UPDATE "CustomerCreditPayment" p
SET "companyId" = s."companyId", "branchId" = s."branchId"
FROM "Shop" s
WHERE s."id" = p."shopId" AND (p."companyId" IS NULL OR p."branchId" IS NULL);

ALTER TABLE "CustomerCreditPayment" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "CustomerCreditPayment" ALTER COLUMN "branchId" SET NOT NULL;
