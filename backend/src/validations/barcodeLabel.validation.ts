import { z } from 'zod';

export const barcodeLabelItemSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  productName: z.string().min(1, 'Item name is required'),
  size: z.string().default('Free'),
  barcode: z.string().min(1, 'Barcode is required'),
  mrp: z.number().nonnegative().default(0),
  price: z.number().nonnegative().default(0),
  labelCount: z.number().int().min(1).default(1),
  costCode: z.string().optional(),
});

export const printBarcodeLabelsSchema = z.object({
  sourceType: z.enum(['PURCHASE_BILL', 'PRODUCT_PICK', 'REPRINT']).default('PURCHASE_BILL'),
  sourceRef: z.string().optional(),
  labelSize: z.string().default('50 × 30 mm · 1 across (thermal roll)'),
  printer: z.string().trim().max(80).optional(),
  showShopName: z.boolean().default(true),
  showItemNameSize: z.boolean().default(true),
  showMrp: z.boolean().default(true),
  showSalePrice: z.boolean().default(true),
  showCostCode: z.boolean().default(false),
  items: z.array(barcodeLabelItemSchema).min(1, 'At least one item is required'),
  totalLabels: z.number().int().min(1),
});

export type BarcodeLabelItem = z.infer<typeof barcodeLabelItemSchema>;
export type PrintBarcodeLabelsInput = z.infer<typeof printBarcodeLabelsSchema>;

