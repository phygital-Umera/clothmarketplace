-- AlterTable
ALTER TABLE "PurchaseBillPayment" ADD COLUMN     "atBilling" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SalesBillPayment" ADD COLUMN     "atBilling" BOOLEAN NOT NULL DEFAULT true;
