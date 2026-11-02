import {z} from 'zod';
import {field} from './custom.validation';
import {listQuerySchema} from '../utils/list';

const emptyToUndefined = (v: unknown) =>
    typeof v === 'string' && v.trim() === '' ? undefined : v;

const text = (label: string, max: number) =>
    field({label, kind: 'text', max, required: false});

// ---- Categories ----
const createCategorySchema = z.object({
    name: field({label: 'Category Name', kind: 'text', max: 60}),
    description: text('Description', 500),
    displayOrder: field({label: 'Display Order', kind: 'displayOrder', required: false}),
    isActive: z.boolean().default(true),
});

const updateCategorySchema = createCategorySchema.partial();

// ---- Subcategories ----
const createSubcategorySchema = z.object({
    name: field({label: 'Subcategory Name', kind: 'text', max: 60}),
    categoryId: z.string({required_error: 'Parent Category is required'}).uuid('Select a valid parent category'),
    description: text('Description', 500),
    displayOrder: field({label: 'Display Order', kind: 'displayOrder', required: false}),
    isActive: z.boolean().default(true),
});

const updateSubcategorySchema = createSubcategorySchema.partial();

// ---- Colors ----
const createColorSchema = z.object({
    name: field({label: 'Color Name', kind: 'text', max: 50}),
    hexCode: z
        .string({required_error: 'Color Code / Hex Value is required'})
        .trim()
        .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Enter a valid hex color code (e.g. #FF0000 or #FFF)'),
    isActive: z.boolean().default(true),
});

const updateColorSchema = createColorSchema.partial();

// ---- Sizes ----
const createSizeSchema = z.object({
    name: z
        .string({required_error: 'Size Name is required'})
        .trim()
        .min(1, 'Size Name must be at least 1 character')
        .max(20, 'Size Name must be at most 20 characters'),
    description: text('Description', 500),
    displayOrder: field({label: 'Display Order', kind: 'displayOrder', required: false}),
    isActive: z.boolean().default(true),
});

const updateSizeSchema = createSizeSchema.partial();

// ---- Query Schemas ----
const masterListSchema = listQuerySchema(
    ['name', 'code', 'createdAt', 'displayOrder'] as const,
    'createdAt',
).extend({
    active: z.enum(['true', 'false']).optional(),
    categoryId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

const idSchema = z.object({
    id: z.string().uuid('Invalid ID parameter'),
});

export default {
    createCategorySchema,
    updateCategorySchema,
    createSubcategorySchema,
    updateSubcategorySchema,
    createColorSchema,
    updateColorSchema,
    createSizeSchema,
    updateSizeSchema,
    masterListSchema,
    idSchema,
};

