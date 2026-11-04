-- CreateEnum
CREATE TYPE "BillPaymentStatus" AS ENUM ('PAID', 'PART_CREDIT', 'CREDIT');

-- AlterTable
ALTER TABLE "PurchaseBill" ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "BillPaymentStatus" NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE "SalesBill" ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "BillPaymentStatus" NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "billPrefix" TEXT,
ADD COLUMN     "gstin" TEXT;

-- CreateTable
CREATE TABLE "SalesBillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesBillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseBillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "salesBillId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "refundMode" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "salesBillItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterSession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingCash" DOUBLE PRECISION NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closingCash" DOUBLE PRECISION,
    "closedById" TEXT,

    CONSTRAINT "CounterSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesBillPayment_billId_idx" ON "SalesBillPayment"("billId");

-- CreateIndex
CREATE INDEX "SalesBillPayment_paidAt_idx" ON "SalesBillPayment"("paidAt");

-- CreateIndex
CREATE INDEX "PurchaseBillPayment_billId_idx" ON "PurchaseBillPayment"("billId");

-- CreateIndex
CREATE INDEX "PurchaseBillPayment_paidAt_idx" ON "PurchaseBillPayment"("paidAt");

-- CreateIndex
CREATE INDEX "SalesReturn_shopId_idx" ON "SalesReturn"("shopId");

-- CreateIndex
CREATE INDEX "SalesReturn_salesBillId_idx" ON "SalesReturn"("salesBillId");

-- CreateIndex
CREATE INDEX "SalesReturn_returnDate_idx" ON "SalesReturn"("returnDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturn_shopId_returnNumber_key" ON "SalesReturn"("shopId", "returnNumber");

-- CreateIndex
CREATE INDEX "SalesReturnItem_returnId_idx" ON "SalesReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "SalesReturnItem_salesBillItemId_idx" ON "SalesReturnItem"("salesBillItemId");

-- CreateIndex
CREATE INDEX "CounterSession_shopId_closedAt_idx" ON "CounterSession"("shopId", "closedAt");

-- CreateIndex
CREATE INDEX "Expense_shopId_expenseDate_idx" ON "Expense"("shopId", "expenseDate");

-- AddForeignKey
ALTER TABLE "SalesBillPayment" ADD CONSTRAINT "SalesBillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SalesBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBillPayment" ADD CONSTRAINT "PurchaseBillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "PurchaseBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_salesBillId_fkey" FOREIGN KEY ("salesBillId") REFERENCES "SalesBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_salesBillItemId_fkey" FOREIGN KEY ("salesBillItemId") REFERENCES "SalesBillItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterSession" ADD CONSTRAINT "CounterSession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: bills created before payment tracking were settled in full
UPDATE "SalesBill" SET "amountPaid" = "totalAmount", "balanceDue" = 0, "paymentStatus" = 'PAID';
UPDATE "PurchaseBill" SET "amountPaid" = "totalAmount", "balanceDue" = 0, "paymentStatus" = 'PAID';

-- One payment row per existing confirmed sales bill, in its recorded mode
INSERT INTO "SalesBillPayment" ("id", "billId", "mode", "amount", "paidAt", "receivedById", "note")
SELECT gen_random_uuid()::text, "id", "paymentMethod", "totalAmount", "billDate", "createdById", 'Recorded before payment tracking'
FROM "SalesBill"
WHERE "status" = 'CONFIRMED' AND "totalAmount" > 0;
