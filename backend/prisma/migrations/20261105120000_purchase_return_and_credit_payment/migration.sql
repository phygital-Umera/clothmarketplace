-- AlterTable
ALTER TABLE "ShopCustomer" ADD COLUMN IF NOT EXISTS "creditDays" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerCreditPayment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerCreditPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PurchaseReturn" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "purchaseBillId" TEXT,
    "supplierName" TEXT NOT NULL,
    "supplierPhone" TEXT,
    "supplierGstin" TEXT,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentVia" TEXT,
    "takeStockFrom" TEXT NOT NULL DEFAULT 'DAMAGED_STOCK',
    "noteToSupplier" TEXT,
    "returnValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "payableBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payableAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settleAs" TEXT NOT NULL DEFAULT 'DEDUCT_FROM_PAYABLE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PurchaseReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "purchaseBillItemId" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "size" TEXT,
    "hsn" TEXT,
    "boughtQty" INTEGER NOT NULL DEFAULT 0,
    "inStockQty" INTEGER NOT NULL DEFAULT 0,
    "returnQty" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,

    CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CustomerCreditPayment_shopId_idx" ON "CustomerCreditPayment"("shopId");
CREATE INDEX IF NOT EXISTS "CustomerCreditPayment_customerId_idx" ON "CustomerCreditPayment"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerCreditPayment_paidAt_idx" ON "CustomerCreditPayment"("paidAt");
CREATE INDEX IF NOT EXISTS "CustomerCreditPayment_receiptNumber_idx" ON "CustomerCreditPayment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseReturn_shopId_returnNumber_key" ON "PurchaseReturn"("shopId", "returnNumber");
CREATE INDEX IF NOT EXISTS "PurchaseReturn_shopId_idx" ON "PurchaseReturn"("shopId");
CREATE INDEX IF NOT EXISTS "PurchaseReturn_purchaseBillId_idx" ON "PurchaseReturn"("purchaseBillId");
CREATE INDEX IF NOT EXISTS "PurchaseReturn_returnDate_idx" ON "PurchaseReturn"("returnDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseReturnItem_returnId_idx" ON "PurchaseReturnItem"("returnId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerCreditPayment_customerId_fkey') THEN
        ALTER TABLE "CustomerCreditPayment" ADD CONSTRAINT "CustomerCreditPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ShopCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerCreditPayment_shopId_fkey') THEN
        ALTER TABLE "CustomerCreditPayment" ADD CONSTRAINT "CustomerCreditPayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseReturn_shopId_fkey') THEN
        ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseReturn_purchaseBillId_fkey') THEN
        ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseReturnItem_returnId_fkey') THEN
        ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

