import { z } from 'zod';

const qty = z.coerce
  .number({invalid_type_error: 'Enter a valid Quantity'})
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(100_000, 'Quantity is too large');
const variantId = z.string({required_error: 'Variant is required'}).uuid('Select a valid item');
const reason = z.string({required_error: 'Reason is required'}).trim().min(1, 'Reason is required').max(200);

export const createAdjustmentSchema = z.object({
  variantId,
  type: z.enum(['INCREASE', 'DECREASE', 'MARK_DAMAGED', 'WRITE_OFF'], {
    errorMap: () => ({message: 'Select an adjustment type'}),
  }),
  quantity: qty,
  reason,
  reference: z.string().trim().max(60).optional().nullable(),
  photoUrl: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

/** /stock/adjust: CORRECTION sets the count, so 0 is allowed there */
export const adjustStockSchema = z
  .object({
    variantId,
    type: z.enum(['INCREASE', 'DECREASE', 'CORRECTION', 'DAMAGE'], {
      errorMap: () => ({message: 'Select an adjustment type'}),
    }),
    quantity: z.coerce.number({invalid_type_error: 'Enter a valid Quantity'}).int('Quantity must be a whole number').min(0).max(100_000),
    reason,
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.type === 'CORRECTION' || v.quantity >= 1, {
    message: 'Quantity must be at least 1',
    path: ['quantity'],
  });

export const physicalCountSchema = z.object({
  notes: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        variantId,
        systemQty: z.coerce.number().int().min(0),
        countedQty: z.coerce.number({invalid_type_error: 'Enter a valid count'}).int().min(0, 'Count cannot be negative').max(100_000),
        reason: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, 'Count at least one item')
    .max(500),
});

export const getAdjustmentsQuerySchema = z.object({
  type: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type GetAdjustmentsQuery = z.infer<typeof getAdjustmentsQuerySchema>;

