-- AlterEnum
ALTER TYPE "StockSourceType" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "CounterSession" ADD COLUMN     "denominations" JSONB,
ADD COLUMN     "depositAmount" DOUBLE PRECISION,
ADD COLUMN     "difference" DOUBLE PRECISION,
ADD COLUMN     "differenceReason" TEXT,
ADD COLUMN     "expectedCash" DOUBLE PRECISION,
ADD COLUMN     "keptFloat" DOUBLE PRECISION,
ADD COLUMN     "reviewAction" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewStatus" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shift" TEXT;

-- CreateTable
CREATE TABLE "CashEntry" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "particulars" TEXT NOT NULL,
    "reference" TEXT,
    "bankName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "inAt" TIMESTAMP(3),
    "outAt" TIMESTAMP(3),
    "markedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "fullname" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "employeeRole" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "fromShopId" TEXT,
    "toShopId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "neededBy" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "dispatchedById" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receiveNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "destVariantId" TEXT NOT NULL,
    "sourceVariantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantSku" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "approvedQty" INTEGER,
    "dispatchedQty" INTEGER,
    "receivedQty" INTEGER,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashEntry_shopId_createdAt_idx" ON "CashEntry"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "CashEntry_sessionId_idx" ON "CashEntry"("sessionId");

-- CreateIndex
CREATE INDEX "Attendance_shopId_date_idx" ON "Attendance"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRequest_requestNumber_key" ON "StaffRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "StaffRequest_branchId_status_idx" ON "StaffRequest"("branchId", "status");

-- CreateIndex
CREATE INDEX "StaffRequest_shopId_idx" ON "StaffRequest"("shopId");

-- CreateIndex
CREATE INDEX "StockTransfer_branchId_status_idx" ON "StockTransfer"("branchId", "status");

-- CreateIndex
CREATE INDEX "StockTransfer_fromShopId_idx" ON "StockTransfer"("fromShopId");

-- CreateIndex
CREATE INDEX "StockTransfer_toShopId_idx" ON "StockTransfer"("toShopId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_branchId_transferNumber_key" ON "StockTransfer"("branchId", "transferNumber");

-- CreateIndex
CREATE INDEX "StockTransferItem_transferId_idx" ON "StockTransferItem"("transferId");

-- CreateIndex
CREATE INDEX "CounterSession_shopId_openedAt_idx" ON "CounterSession"("shopId", "openedAt");

-- AddForeignKey
ALTER TABLE "CashEntry" ADD CONSTRAINT "CashEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashEntry" ADD CONSTRAINT "CashEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CounterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromShopId_fkey" FOREIGN KEY ("fromShopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toShopId_fkey" FOREIGN KEY ("toShopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
