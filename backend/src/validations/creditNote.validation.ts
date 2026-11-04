import {z} from 'zod';
import {ReturnSettlement, ReturnStockTo} from '@prisma/client';
import {field} from './custom.validation';
import {listQuerySchema} from '../utils/list';

// Sales returns: a credit note returns units of a confirmed POS sales bill.
// Amounts are always computed on the server from the original bill.

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const RETURN_REASONS = ['DEFECTIVE', 'SIZE', 'COLOUR', 'CHANGED_MIND', 'OTHER'] as const;
export const REFUND_MODES = ['CASH', 'CARD', 'UPI'] as const;

const createCreditNoteSchema = z
    .object({
        salesBillId: z.string().uuid('Select a valid sales bill'),
        settlement: z.nativeEnum(ReturnSettlement, {required_error: 'Choose how to settle'}),
        refundMode: z.preprocess(emptyToUndefined, z.enum(REFUND_MODES).optional()),
        reason: z.enum(RETURN_REASONS, {required_error: 'Choose a reason'}),
        reasonNote: field({label: 'Reason Note', kind: 'text', max: 500, required: false}),
        stockTo: z.nativeEnum(ReturnStockTo).default(ReturnStockTo.RESTOCK),
        items: z
            .array(
                z.object({
                    salesBillItemId: z.string().uuid('Select a valid item'),
                    quantity: z.coerce
                        .number({invalid_type_error: 'Enter a valid Quantity'})
                        .int('Quantity must be a whole number')
                        .min(1, 'Quantity must be at least 1'),
                }),
                {required_error: 'Choose at least one item to return'},
            )
            .min(1, 'Choose at least one item to return')
            .max(200),
    })
    .superRefine((data, ctx) => {
        if (data.settlement === ReturnSettlement.REFUND && !data.refundMode) {
            ctx.addIssue({
                code: 'custom',
                path: ['refundMode'],
                message: 'Choose how the refund is paid',
            });
        }
        const seen = new Set<string>();
        data.items.forEach((item, i) => {
            if (seen.has(item.salesBillItemId)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['items', i, 'salesBillItemId'],
                    message: 'This item is listed twice',
                });
            }
            seen.add(item.salesBillItemId);
        });
    });

/** Branch admin decision on a note waiting for approval */
const decideCreditNoteSchema = z
    .object({
        action: z.enum(['APPROVE', 'STORE_CREDIT', 'REJECT']),
        stockTo: z.nativeEnum(ReturnStockTo).default(ReturnStockTo.RESTOCK),
        note: field({label: 'Note', kind: 'text', max: 500, required: false}),
    })
    .superRefine((data, ctx) => {
        if (data.action === 'REJECT' && !data.note) {
            ctx.addIssue({code: 'custom', path: ['note'], message: 'Say why it is rejected'});
        }
    });

const creditNoteListSchema = listQuerySchema(
    ['createdAt', 'noteNumber', 'totalAmount'] as const,
    'createdAt',
).extend({
    tab: z.preprocess(
        emptyToUndefined,
        z.enum(['NEEDS_APPROVAL', 'EXCHANGE', 'STORE_CREDIT', 'REFUNDED', 'REJECTED']).optional(),
    ),
    shopId: z.preprocess(emptyToUndefined, z.string().uuid('Invalid shop').optional()),
    from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});

const creditNoteSummarySchema = z.object({
    shopId: z.preprocess(emptyToUndefined, z.string().uuid('Invalid shop').optional()),
});

const returnableSchema = z.object({
    bill: z.string().trim().min(1, 'Enter a bill number').max(60),
});

const idSchema = z.object({id: z.string().uuid('Invalid ID parameter')});

export default {
    createCreditNoteSchema,
    decideCreditNoteSchema,
    creditNoteListSchema,
    creditNoteSummarySchema,
    returnableSchema,
    idSchema,
};
