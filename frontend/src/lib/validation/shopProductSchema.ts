import {ShopProduct} from '@/types/shopProduct';
import {z} from 'zod';
import {field} from './fieldRules';

// Same labels and rules as backend/src/validations/shopProduct.validation.ts.
// Price = mrp, Discount Price = sellingPrice. SKU is optional: the backend
// generates one when it is left blank.

const text = (label: string, max: number) =>
  field({label, kind: 'text', max, required: false});

export const shopProductSchema = z
  .object({
    name: field({label: 'Product Name', kind: 'text', max: 120}),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) => v === '' || /^[A-Z0-9-]{3,40}$/.test(v),
        'SKU must be 3-40 letters, numbers or dashes',
      ),
    shortDesc: text('Short Description', 300),
    detailedDesc: field({label: 'Description', kind: 'text', max: 4000}),
    categoryId: z.string().min(1, 'Category is required'),
    // Optional: blank = no subcategory
    subcategoryId: z.string(),
    sizeIds: z.array(z.string()).min(1, 'Select at least one Size'),
    colorIds: z.array(z.string()).min(1, 'Select at least one Color'),
    mrp: field({label: 'Price', kind: 'price'}).refine(
      (v) => v > 0,
      'Price must be more than 0',
    ),
    sellingPrice: field({
      label: 'Discount Price',
      kind: 'price',
      required: false,
    }),
    // New products only: pieces per "sizeId_colorId"; blank = 0
    openingStock: z.record(
      z.string(),
      field({label: 'Opening Stock', kind: 'quantity', required: false}),
    ),
    status: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED']),
    gender: z.string(),
    taxRate: z.coerce.number(),
    hsnCode: z
      .string()
      .trim()
      .min(1, 'HSN Code is required')
      .regex(/^(\d{4}|\d{6}|\d{8})$/, 'HSN Code must be 4, 6 or 8 digits'),
    productType: text('Product Type', 60),
    fabric: text('Fabric', 60),
    pattern: text('Pattern', 60),
    fit: text('Fit', 60),
    sleeveType: text('Sleeve Type', 60),
    neckType: text('Neck Type', 60),
    occasion: text('Occasion', 60),
    season: text('Season', 60),
    careInstructions: text('Care Instructions', 300),
    tagsText: z.string().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.sellingPrice !== undefined && v.sellingPrice > v.mrp) {
      ctx.addIssue({
        code: 'custom',
        path: ['sellingPrice'],
        message: 'Discount Price cannot be more than Price',
      });
    }
  });

export type ShopProductValues = z.input<typeof shopProductSchema>;
export type ShopProductOutput = z.output<typeof shopProductSchema>;

export const EMPTY_SHOP_PRODUCT: ShopProductValues = {
  name: '',
  sku: '',
  shortDesc: '',
  detailedDesc: '',
  categoryId: '',
  subcategoryId: '',
  sizeIds: [],
  colorIds: [],
  mrp: '',
  sellingPrice: '',
  openingStock: {},
  status: 'DRAFT',
  gender: 'UNISEX',
  taxRate: 5,
  hsnCode: '',
  productType: '',
  fabric: '',
  pattern: '',
  fit: '',
  sleeveType: '',
  neckType: '',
  occasion: '',
  season: '',
  careInstructions: '',
  tagsText: '',
};

export const fromShopProduct = (p: ShopProduct): ShopProductValues => ({
  name: p.name,
  sku: p.sku,
  shortDesc: p.shortDesc ?? '',
  detailedDesc: p.detailedDesc ?? '',
  categoryId: p.categoryId,
  subcategoryId: p.subcategoryId ?? '',
  sizeIds: p.sizes.map((s) => s.id),
  colorIds: p.colors.map((c) => c.id),
  mrp: p.mrp,
  // A discount equal to the price means "no discount"
  sellingPrice: p.sellingPrice < p.mrp ? p.sellingPrice : '',
  // Stock changes through purchase bills and stock adjustments, not this form
  openingStock: {},
  status:
    p.status === 'PUBLISHED' || p.status === 'UNPUBLISHED' ? p.status : 'DRAFT',
  gender: p.gender,
  taxRate: p.taxRate,
  hsnCode: p.hsnCode ?? '',
  productType: p.productType ?? '',
  fabric: p.fabric ?? '',
  pattern: p.pattern ?? '',
  fit: p.fit ?? '',
  sleeveType: p.sleeveType ?? '',
  neckType: p.neckType ?? '',
  occasion: p.occasion ?? '',
  season: p.season ?? '',
  careInstructions: p.careInstructions ?? '',
  tagsText: p.tags.join(', '),
});

/** Form key of one size + colour cell in the opening stock grid */
export const openingStockKey = (sizeId: string, colorId: string) =>
  `${sizeId}_${colorId}`;

/**
 * Form values -> API body (tags as a list, blank SKU left to the backend,
 * blank subcategory = none, opening stock only for the picked sizes and colours)
 */
export const toShopProductBody = ({
  tagsText,
  sku,
  subcategoryId,
  openingStock,
  ...rest
}: ShopProductOutput) => {
  const opening = Object.entries(openingStock)
    .map(([key, quantity]) => {
      const [sizeId, colorId] = key.split('_');
      return {sizeId, colorId, quantity: quantity ?? 0};
    })
    .filter(
      (o) =>
        o.quantity > 0 &&
        rest.sizeIds.includes(o.sizeId) &&
        rest.colorIds.includes(o.colorId),
    );
  return {
    ...rest,
    sku: sku || undefined,
    subcategoryId: subcategoryId || null,
    tags: (tagsText ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    ...(opening.length ? {openingStock: opening} : {}),
  };
};
