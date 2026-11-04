-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopCustomer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "customerType" TEXT NOT NULL DEFAULT 'Retail',
    "businessName" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBought" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopCustomer_shopId_idx" ON "ShopCustomer"("shopId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopCustomer_mobile_idx" ON "ShopCustomer"("mobile");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopCustomer_customerType_idx" ON "ShopCustomer"("customerType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ShopCustomer_shopId_mobile_key" ON "ShopCustomer"("shopId", "mobile");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopCustomer_companyId_fkey'
  ) THEN
    ALTER TABLE "ShopCustomer" ADD CONSTRAINT "ShopCustomer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopCustomer_branchId_fkey'
  ) THEN
    ALTER TABLE "ShopCustomer" ADD CONSTRAINT "ShopCustomer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ShopCustomer_shopId_fkey'
  ) THEN
    ALTER TABLE "ShopCustomer" ADD CONSTRAINT "ShopCustomer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

