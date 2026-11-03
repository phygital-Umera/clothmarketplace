import {z} from 'zod';
import {BillStatus} from '@prisma/client';
import {field} from './custom.validation';
import {listQuerySchema} from '../utils/list';

// Shop purchase bills (stock in) and sales bills (stock out). Totals are
// always recomputed on the server; only quantities and rates are trusted.

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const text = (label: string, max: number) => field({label, kind: 'text', max, required: false});
const money = (label: string) =>
    z.coerce
        .number({invalid_type_error: `Enter a valid ${label}`})
        .min(0, `${label} cannot be negative`)
        .max(10_000_000, `${label} is too large`)
        .transform((v) => Math.round(v * 100) / 100);
const quantity = z.coerce
    .number({invalid_type_error: 'Enter a valid Quantity'})
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(100_000, 'Quantity is too large');
const taxRate = z.coerce
    .number()
    .refine((v) => [0, 5, 12, 18].includes(v), 'Tax Rate must be 0, 5, 12 or 18%')
    .default(0);
const billDate = z.coerce
    .date({invalid_type_error: 'Enter a valid Bill Date'})
    .refine((d) => d.getTime() <= Date.now() + 60_000, 'Bill Date cannot be in the future')
    .optional();
/** A bill is saved as a draft (no stock effect) or confirmed (stock posted) */
const saveStatus = z.enum([BillStatus.DRAFT, BillStatus.CONFIRMED]).default(BillStatus.CONFIRMED);

const uniqueVariants = (items: Array<{variantId: string}>, ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    items.forEach((item, i) => {
        if (seen.has(item.variantId)) {
            ctx.addIssue({
                code: 'custom',
                path: [i, 'variantId'],
                message: 'This item is already on the bill; change its quantity instead',
            });
        }
        seen.add(item.variantId);
    });
};

const items = <T extends z.ZodRawShape>(shape: T) =>
    z
        .array(z.object({variantId: z.string().uuid('Select a valid item'), quantity, ...shape}), {
            required_error: 'Add at least one item',
        })
        .min(1, 'Add at least one item')
        .max(200, 'At most 200 items per bill')
        .superRefine((list, ctx) => uniqueVariants(list as Array<{variantId: string}>, ctx));

const purchaseFields = {
    supplierName: field({label: 'Supplier Name', kind: 'text', max: 120}),
    supplierInvoiceNo: text('Supplier Invoice No', 60),
    supplierPhone: field({label: 'Supplier Phone', kind: 'phone', required: false}),
    billDate,
    discount: money('Discount').default(0),
    notes: text('Notes', 1000),
    items: items({unitCost: money('Unit Cost'), taxRate}),
};

const salesFields = {
    customerName: text('Customer Name', 120),
    customerPhone: field({label: 'Customer Phone', kind: 'phone', required: false}),
    billDate,
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI']).default('CASH'),
    discount: money('Discount').default(0),
    notes: text('Notes', 1000),
    items: items({
        unitPrice: money('Unit Price'),
        discount: money('Item Discount').default(0),
        taxRate,
    }),
};

const createPurchaseBillSchema = z.object({...purchaseFields, status: saveStatus});
const createSalesBillSchema = z.object({...salesFields, status: saveStatus});

// Edits resend the full bill plus the version that was loaded (optimistic lock)
const version = z.coerce.number({required_error: 'Bill version is required'}).int().min(0);
const updatePurchaseBillSchema = z.object({...purchaseFields, version});
const updateSalesBillSchema = z.object({...salesFields, version});

const cancelBillSchema = z.object({
    reason: field({label: 'Cancel Reason', kind: 'text', max: 300}),
});

const billListSchema = listQuerySchema(
    ['billDate', 'billNumber', 'totalAmount', 'createdAt'] as const,
    'billDate',
).extend({
    status: z.preprocess(emptyToUndefined, z.nativeEnum(BillStatus).optional()),
    from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});

const idSchema = z.object({id: z.string().uuid('Invalid ID parameter')});

export default {
    createPurchaseBillSchema,
    updatePurchaseBillSchema,
    createSalesBillSchema,
    updateSalesBillSchema,
    cancelBillSchema,
    billListSchema,
    idSchema,
};
