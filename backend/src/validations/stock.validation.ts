import { z } from 'zod';

export const getStockSummarySchema = z.object({
  period: z.enum(['today', 'this-week', 'this-month', 'last-30-days', 'all-time']).default('this-month'),
  tab: z.enum(['STOCK_SUMMARY', 'LOW_OUT', 'DAMAGED', 'SLOW_MOVING']).default('STOCK_SUMMARY'),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(50),
});

export const adjustStockSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  type: z.enum(['INCREASE', 'DECREASE', 'CORRECTION', 'DAMAGE']),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

export const physicalStockCountItemSchema = z.object({
  variantId: z.string().min(1),
  systemQty: z.number().int().min(0),
  countedQty: z.number().int().min(0),
  reason: z.string().optional(),
});

export const physicalStockCountSchema = z.object({
  notes: z.string().optional(),
  items: z.array(physicalStockCountItemSchema).min(1, 'At least one item is required'),
});

export type GetStockSummaryInput = z.infer<typeof getStockSummarySchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type PhysicalStockCountInput = z.infer<typeof physicalStockCountSchema>;

