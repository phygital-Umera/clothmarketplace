import { z } from 'zod';

export const createAdjustmentSchema = z.object({
  variantId: z.string().min(1, 'Variant is required'),
  type: z.enum(['INCREASE', 'DECREASE', 'MARK_DAMAGED', 'WRITE_OFF']),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const getAdjustmentsQuerySchema = z.object({
  type: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type GetAdjustmentsQuery = z.infer<typeof getAdjustmentsQuerySchema>;

