-- Online orders were saved with tax = 0 although store prices include GST.
-- Work the included GST back out of each line, after its share of the coupon.
UPDATE "Order" o
SET "tax" = t.tax
FROM (
    SELECT oi."orderId",
           ROUND(SUM(
               oi."totalPrice"
               * (CASE WHEN ord."subtotal" > 0 THEN (ord."subtotal" - ord."couponDiscount") / ord."subtotal" ELSE 1 END)
               * COALESCE(p."taxRate", 0) / (100 + COALESCE(p."taxRate", 0))
           )::numeric, 2)::double precision AS tax
    FROM "OrderItem" oi
    JOIN "Order" ord ON ord."id" = oi."orderId"
    JOIN "Product" p ON p."id" = oi."productId"
    GROUP BY oi."orderId"
) t
WHERE o."id" = t."orderId" AND o."tax" = 0;
