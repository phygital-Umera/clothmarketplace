-- AlterTable StockAdjustment
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "adjustmentNumber" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "shopId" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "availableBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "availableAfter" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "damagedBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "damagedAfter" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "StockAdjustment_branchId_createdAt_idx" ON "StockAdjustment"("branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockAdjustment_variantId_idx" ON "StockAdjustment"("variantId");
CREATE INDEX IF NOT EXISTS "StockAdjustment_adjustmentNumber_idx" ON "StockAdjustment"("adjustmentNumber");

