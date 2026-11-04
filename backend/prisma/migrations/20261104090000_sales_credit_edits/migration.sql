-- Sales bills: credit (amount paid vs owed) and edit tracking
ALTER TABLE "SalesBill" ADD COLUMN "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "creditAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "editCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastEditedAt" TIMESTAMP(3);

-- Existing bills were paid in full at billing
UPDATE "SalesBill" SET "paidAmount" = "totalAmount";

CREATE INDEX "SalesBill_createdById_idx" ON "SalesBill"("createdById");
