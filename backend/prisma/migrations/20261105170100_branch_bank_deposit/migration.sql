-- CreateTable
CREATE TABLE "BankDeposit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "depositDate" DATE NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bank" TEXT NOT NULL,
    "reference" TEXT,
    "slipUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankDeposit_branchId_depositDate_idx" ON "BankDeposit"("branchId", "depositDate");
