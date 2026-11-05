-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "damagedQty" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PhysicalStockAudit" (
    "id" TEXT NOT NULL,
    "auditNumber" TEXT NOT NULL,
    "shopId" TEXT,
    "branchId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "conductedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalItemsCounted" INTEGER NOT NULL DEFAULT 0,
    "discrepanciesCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "auditItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalStockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhysicalStockAudit_branchId_createdAt_idx" ON "PhysicalStockAudit"("branchId", "createdAt");

