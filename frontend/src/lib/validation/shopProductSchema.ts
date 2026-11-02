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
    subcategoryId: z.string().min(1, 'Subcategory is required'),
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
    stockQuantity: field({label: 'Stock Quantity', kind: 'quantity'}),
    status: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED']),
    gender: z.string(),
    taxRate: z.coerce.number(),
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
  stockQuantity: '',
  status: 'DRAFT',
  gender: 'UNISEX',
  taxRate: 5,
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
  stockQuantity: p.stockQuantity,
  status:
    p.status === 'PUBLISHED' || p.status === 'UNPUBLISHED' ? p.status : 'DRAFT',
  gender: p.gender,
  taxRate: p.taxRate,
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

/** Form values -> API body (tags as a list, blank SKU left to the backend) */
export const toShopProductBody = ({
  tagsText,
  sku,
  ...rest
}: ShopProductOutput) => ({
  ...rest,
  sku: sku || undefined,
  tags: (tagsText ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
});
