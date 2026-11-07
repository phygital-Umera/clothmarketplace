-- Order lines saved the product's main photo even when the ordered colour has its own
-- photo; point them at the colour photo (only where the saved photo is a product photo)
UPDATE "OrderItem" oi
SET "image" = v."image"
FROM "ProductVariant" v
WHERE oi."variantId" = v."id"
  AND v."image" IS NOT NULL AND v."image" <> ''
  AND oi."image" IS DISTINCT FROM v."image"
  AND (oi."image" IS NULL OR oi."image" IN (SELECT pi."url" FROM "ProductImage" pi WHERE pi."productId" = oi."productId"));
