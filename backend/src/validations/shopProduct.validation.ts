import {z} from 'zod';
import {GenderTarget, ProductStatus} from '@prisma/client';
import {field} from './custom.validation';
import {listQuerySchema} from '../utils/list';

// Shop-side products: built on the shop masters (category, subcategory,
// sizes, colors). Price = mrp, discount price = sellingPrice.

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const text = (label: string, max: number) => field({label, kind: 'text', max, required: false});
const id = (label: string) =>
    z.string({required_error: `${label} is required`}).uuid(`Select a valid ${label}`);
const ids = (label: string, max: number) =>
    z
        .array(z.string().uuid(`Select a valid ${label}`), {
            required_error: `Select at least one ${label}`,
        })
        .min(1, `Select at least one ${label}`)
        .max(max, `At most ${max} ${label}s`)
        .transform((list) => [...new Set(list)]);

/** Statuses a shop admin can set directly */
const SHOP_STATUSES = [
    ProductStatus.DRAFT,
    ProductStatus.PUBLISHED,
    ProductStatus.UNPUBLISHED,
] as const;

const productFields = {
    name: field({label: 'Product Name', kind: 'text', max: 120}),
    sku: z.preprocess(
        emptyToUndefined,
        z
            .string()
            .trim()
            .toUpperCase()
            .regex(/^[A-Z0-9-]{3,40}$/, 'SKU must be 3-40 letters, numbers or dashes')
            .optional(),
    ),
    shortDesc: text('Short Description', 300),
    detailedDesc: field({label: 'Description', kind: 'text', max: 4000}),
    categoryId: id('Category'),
    // Optional: blank or null = no subcategory (on edit, clears it)
    subcategoryId: z.preprocess(
        (v) => (v === '' ? null : v),
        z.string().uuid('Select a valid Subcategory').nullable().optional(),
    ),
    sizeIds: ids('Size', 30),
    colorIds: ids('Color', 30),
    mrp: z.preprocess(
        (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : emptyToUndefined(v)),
        z
            .number({
                required_error: 'Price is required',
                invalid_type_error: 'Enter a valid Price',
            })
            .positive('Price must be more than 0')
            .refine(
                (v) => /^\d+(\.\d{1,2})?$/.test(String(v)),
                'Price can have at most 2 decimals',
            ),
    ),
    sellingPrice: field({label: 'Discount Price', kind: 'price', required: false}),
    stockQuantity: field({label: 'Stock Quantity', kind: 'quantity'}),
    status: z.enum(SHOP_STATUSES).default(ProductStatus.DRAFT),
    gender: z.nativeEnum(GenderTarget).default(GenderTarget.UNISEX),
    tags: z.array(z.string().trim().min(1).max(30)).max(15, 'At most 15 tags').default([]),
    productType: text('Product Type', 60),
    fabric: text('Fabric', 60),
    pattern: text('Pattern', 60),
    fit: text('Fit', 60),
    sleeveType: text('Sleeve Type', 60),
    neckType: text('Neck Type', 60),
    occasion: text('Occasion', 60),
    season: text('Season', 60),
    careInstructions: text('Care Instructions', 300),
    taxRate: z.coerce
        .number()
        .refine((v) => [0, 5, 12, 18].includes(v), 'Tax Rate must be 0, 5, 12 or 18%')
        .default(5),
};

const priceRule = (v: {mrp?: number; sellingPrice?: number}, ctx: z.RefinementCtx) => {
    if (v.mrp !== undefined && v.sellingPrice !== undefined && v.sellingPrice > v.mrp) {
        ctx.addIssue({
            code: 'custom',
            path: ['sellingPrice'],
            message: 'Discount Price cannot be more than Price',
        });
    }
};

const createShopProductSchema = z.object(productFields).superRefine(priceRule);

// Partial without defaults, so an update never resets fields that were not sent
const updateShopProductSchema = z
    .object({
        ...productFields,
        status: z.enum(SHOP_STATUSES),
        gender: z.nativeEnum(GenderTarget),
        tags: productFields.tags.removeDefault(),
        taxRate: z.coerce
            .number()
            .refine((v) => [0, 5, 12, 18].includes(v), 'Tax Rate must be 0, 5, 12 or 18%'),
    })
    .partial()
    .superRefine(priceRule);

const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());

const shopProductListSchema = listQuerySchema(
    ['name', 'sku', 'mrp', 'sellingPrice', 'stockQuantity', 'createdAt'] as const,
    'createdAt',
).extend({
    status: z.preprocess(emptyToUndefined, z.nativeEnum(ProductStatus).optional()),
    categoryId: optionalUuid,
    subcategoryId: optionalUuid,
    colorId: optionalUuid,
    sizeId: optionalUuid,
    stock: z.preprocess(emptyToUndefined, z.enum(['in', 'low', 'out']).optional()),
});

const generatePreviewSchema = z.object({
    colorIds: z
        .array(z.string().uuid('Select a valid color'), {
            required_error: 'Select at least one color',
        })
        .min(1, 'Select at least one color')
        .max(6, 'Generate at most 6 colors at a time')
        .transform((list) => [...new Set(list)]),
    imageId: z.preprocess(emptyToUndefined, z.string().uuid('Select a valid image').optional()),
});

const idSchema = z.object({id: z.string().uuid('Invalid ID parameter')});
const imageIdSchema = idSchema.extend({imageId: z.string().uuid('Invalid image ID')});

/** Style of an AI professional photo */
const professionalPhotoSchema = z.object({
    style: z.enum(['GHOST', 'MANNEQUIN', 'MODEL'], {errorMap: () => ({message: 'Pick a photo style'})}),
    /** Shop's own words about the garment, e.g. "turtleneck, rib knit, no zip" */
    details: z.string().trim().max(200, 'Keep the details under 200 characters').optional(),
});
const previewIdSchema = idSchema.extend({previewId: z.string().uuid('Invalid preview ID')});
const imageUpdateSchema = z.object({
    isMain: z.boolean().optional(),
    altText: text('Alt Text', 150),
});

export default {
    createShopProductSchema,
    updateShopProductSchema,
    shopProductListSchema,
    generatePreviewSchema,
    idSchema,
    imageIdSchema,
    professionalPhotoSchema,
    previewIdSchema,
    imageUpdateSchema,
};
