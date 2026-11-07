-- Counter bills now use the tag price (GST included), like the online store.
-- Older bills keep their GST-on-top maths (pricesIncludeTax = false).
ALTER TABLE "SalesBill" ADD COLUMN "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0;
