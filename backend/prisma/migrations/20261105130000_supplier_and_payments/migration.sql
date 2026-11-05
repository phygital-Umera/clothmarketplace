-- CreateTable Supplier
CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'Net 30',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "nextDue" TEXT,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupplierPayment
CREATE TABLE IF NOT EXISTS "SupplierPayment" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "billId" TEXT,
    "billNumber" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'NEFT / RTGS',
    "paidFrom" TEXT NOT NULL DEFAULT 'Bank - HDFC current a/c (**4417)',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utrChequeNo" TEXT,
    "tdsDeducted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shopId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Supplier_branchId_idx" ON "Supplier"("branchId");
CREATE INDEX IF NOT EXISTS "Supplier_shopId_idx" ON "Supplier"("shopId");
CREATE INDEX IF NOT EXISTS "Supplier_name_idx" ON "Supplier"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_branchId_name_key" ON "Supplier"("branchId", "name");

CREATE INDEX IF NOT EXISTS "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_branchId_idx" ON "SupplierPayment"("branchId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_shopId_idx" ON "SupplierPayment"("shopId");
CREATE INDEX IF NOT EXISTS "SupplierPayment_paymentDate_idx" ON "SupplierPayment"("paymentDate");
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierPayment_branchId_receiptNumber_key" ON "SupplierPayment"("branchId", "receiptNumber");

-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierPayment_supplierId_fkey') THEN
        ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

