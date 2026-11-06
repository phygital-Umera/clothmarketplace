-- Shop masters become per company. Subcategory, Color and Size get a
-- companyId like Category already has: null = platform-wide (super admin),
-- otherwise the company that owns it. Until now any shop could see, edit and
-- delete every company's masters.

ALTER TABLE "Subcategory" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Color" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Size" ADD COLUMN "companyId" TEXT;

CREATE INDEX "Subcategory_companyId_idx" ON "Subcategory"("companyId");
CREATE INDEX "Color_companyId_idx" ON "Color"("companyId");
CREATE INDEX "Size_companyId_idx" ON "Size"("companyId");

ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Color" ADD CONSTRAINT "Color_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Size" ADD CONSTRAINT "Size_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: a master used by the products of exactly one company belongs to
-- that company. Masters used by several companies, or by none, stay
-- platform-wide so nothing disappears from anyone's lists.
UPDATE "Color" c SET "companyId" = u."companyId"
FROM (
    SELECT pc."colorId", MIN(p."companyId") AS "companyId"
    FROM "ProductColor" pc JOIN "Product" p ON p."id" = pc."productId"
    GROUP BY pc."colorId" HAVING COUNT(DISTINCT p."companyId") = 1
) u
WHERE c."id" = u."colorId";

UPDATE "Size" s SET "companyId" = u."companyId"
FROM (
    SELECT ps."sizeId", MIN(p."companyId") AS "companyId"
    FROM "ProductSize" ps JOIN "Product" p ON p."id" = ps."productId"
    GROUP BY ps."sizeId" HAVING COUNT(DISTINCT p."companyId") = 1
) u
WHERE s."id" = u."sizeId";

UPDATE "Subcategory" sc SET "companyId" = u."companyId"
FROM (
    SELECT p."subcategoryId", MIN(p."companyId") AS "companyId"
    FROM "Product" p WHERE p."subcategoryId" IS NOT NULL
    GROUP BY p."subcategoryId" HAVING COUNT(DISTINCT p."companyId") = 1
) u
WHERE sc."id" = u."subcategoryId";

-- Payment and print records no longer get made-up defaults
-- (a sample bank account and printer model were being saved on every record)
ALTER TABLE "SupplierPayment" ALTER COLUMN "paidFrom" DROP NOT NULL, ALTER COLUMN "paidFrom" DROP DEFAULT;
UPDATE "SupplierPayment" SET "paidFrom" = NULL WHERE "paidFrom" = 'Bank - HDFC current a/c (**4417)';
ALTER TABLE "BarcodePrintJob" ALTER COLUMN "printer" DROP NOT NULL, ALTER COLUMN "printer" DROP DEFAULT;
