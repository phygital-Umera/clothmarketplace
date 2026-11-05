import { z } from 'zod';

export const purchaseReturnItemSchema = z.object({
  purchaseBillItemId: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  productName: z.string().min(1, 'Product name is required'),
  size: z.string().optional(),
  hsn: z.string().optional(),
  boughtQty: z.number().int().nonnegative().default(0),
  inStockQty: z.number().int().nonnegative().default(0),
  returnQty: z.number().int().nonnegative().default(0),
  unitCost: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().default(5),
  reason: z.string().optional(),
});

export const createPurchaseReturnSchema = z.object({
  supplierName: z.string().min(1, 'Supplier is required'),
  purchaseBillId: z.string().optional(),
  returnDate: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
  sentVia: z.string().optional(),
  takeStockFrom: z.enum(['DAMAGED_STOCK', 'ACTIVE_STOCK']).default('DAMAGED_STOCK'),
  noteToSupplier: z.string().optional(),
  settleAs: z
    .enum(['DEDUCT_FROM_PAYABLE', 'BANK_REFUND', 'SUPPLIER_CREDIT'])
    .default('DEDUCT_FROM_PAYABLE'),
  items: z.array(purchaseReturnItemSchema).min(1, 'At least one item is required'),
});

export type CreatePurchaseReturnInput = z.infer<typeof createPurchaseReturnSchema>;
export type PurchaseReturnItemInput = z.infer<typeof purchaseReturnItemSchema>;

