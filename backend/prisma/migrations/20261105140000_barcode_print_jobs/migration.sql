-- CreateTable BarcodePrintJob
CREATE TABLE IF NOT EXISTS "BarcodePrintJob" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "shopId" TEXT,
    "branchId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'PURCHASE_BILL',
    "sourceRef" TEXT,
    "labelSize" TEXT NOT NULL DEFAULT '50x30mm',
    "printer" TEXT NOT NULL DEFAULT 'TSC TE244 (USB)',
    "showShopName" BOOLEAN NOT NULL DEFAULT true,
    "showItemNameSize" BOOLEAN NOT NULL DEFAULT true,
    "showMrp" BOOLEAN NOT NULL DEFAULT true,
    "showSalePrice" BOOLEAN NOT NULL DEFAULT true,
    "showCostCode" BOOLEAN NOT NULL DEFAULT false,
    "totalLabels" INTEGER NOT NULL DEFAULT 0,
    "itemsSummary" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarcodePrintJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BarcodePrintJob_jobId_key" ON "BarcodePrintJob"("jobId");
CREATE INDEX IF NOT EXISTS "BarcodePrintJob_branchId_idx" ON "BarcodePrintJob"("branchId");
CREATE INDEX IF NOT EXISTS "BarcodePrintJob_shopId_idx" ON "BarcodePrintJob"("shopId");
CREATE INDEX IF NOT EXISTS "BarcodePrintJob_createdAt_idx" ON "BarcodePrintJob"("createdAt");

