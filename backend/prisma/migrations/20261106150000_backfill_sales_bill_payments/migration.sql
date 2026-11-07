-- Sales bills were saved without their counter payment rows (create and edit
-- skipped them), so the dashboard showed them as "Credit" and the cash book /
-- day close missed counter sales. Add the payment taken at billing for every
-- bill that has none: amount paid so far minus later due collections.
INSERT INTO "SalesBillPayment" ("id", "billId", "mode", "amount", "paidAt", "receivedById", "note", "atBilling", "createdAt")
SELECT
    md5(random()::text || clock_timestamp()::text || b."id"),
    b."id",
    CASE WHEN b."paymentMethod" = 'CREDIT' THEN 'CASH' ELSE b."paymentMethod" END,
    ROUND((b."amountPaid" - COALESCE(later.total, 0))::numeric, 2)::double precision,
    b."billDate",
    b."createdById",
    'Taken at billing (restored)',
    true,
    b."createdAt"
FROM "SalesBill" b
LEFT JOIN (
    SELECT "billId", SUM("amount") AS total
    FROM "SalesBillPayment"
    WHERE "atBilling" = false
    GROUP BY "billId"
) later ON later."billId" = b."id"
WHERE b."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "SalesBillPayment" p WHERE p."billId" = b."id" AND p."atBilling" = true)
  AND b."amountPaid" - COALESCE(later.total, 0) > 0.009;
