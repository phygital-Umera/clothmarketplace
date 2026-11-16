import {z} from 'zod';
import {GST_RATES} from '@utils/gst';

/** A GST rate in use in India (0, 0.25, 3, 5, 12, 18, 28 or 40%) */
export const gstRate = (label = 'GST Rate') =>
    z.coerce
        .number({invalid_type_error: `Enter a valid ${label}`})
        .refine(
            (v) => (GST_RATES as readonly number[]).includes(v),
            `${label} must be one of ${GST_RATES.join(', ')}%`,
        );

/** A product's rate: a fixed rate, or null/'' = follow the shop's GST rule (D-18) */
export const productGstRate = z.preprocess(
    (v) => (v === '' || v === 'AUTO' ? null : v),
    gstRate().nullable(),
);

/** D-18: one price rule per shop, and the slabs its products may use */
const gstRuleSchema = z
    .object({
        threshold: z.coerce
            .number({invalid_type_error: 'Enter a valid Price Limit'})
            .min(0, 'Price Limit cannot be negative')
            .max(1_000_000, 'Price Limit is too large'),
        rateUpTo: gstRate('Rate up to the limit'),
        rateAbove: gstRate('Rate above the limit'),
        slabs: z
            .array(gstRate('Slab'))
            .min(1, 'Pick at least one GST slab')
            .transform((list) => [...new Set(list)].sort((a, b) => a - b)),
    })
    .superRefine((v, ctx) => {
        if (!v.slabs.includes(v.rateUpTo)) {
            ctx.addIssue({
                code: 'custom',
                path: ['rateUpTo'],
                message: 'This rate must be one of the slabs',
            });
        }
        if (!v.slabs.includes(v.rateAbove)) {
            ctx.addIssue({
                code: 'custom',
                path: ['rateAbove'],
                message: 'This rate must be one of the slabs',
            });
        }
    });

export default {gstRuleSchema};
