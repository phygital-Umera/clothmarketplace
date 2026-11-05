-- A shop may request an item it does not carry yet; it is copied in on receipt
ALTER TABLE "StockTransferItem" ALTER COLUMN "destVariantId" DROP NOT NULL;
