import {z} from 'zod';

const disposalSchema = z.object({
  name: z.string().min(1, {message: 'Name is required'}),
  categoryId: z.string().uuid({message: 'Invalid Category ID'}),
  languageId: z.string().uuid({message: 'Invalid Language ID'}),
});

const disposalSchemaa = z.object({
  disposalName: z.string().nonempty('Disposal name is required'),
  disposalCategory: z.string().nonempty('Disposal category is required'),
});

export const disposalcategorySchema = z.object({
  disposalName: z.string().min(1, 'Disposal category name is required'),
  language: z.string().min(1, 'Language is required'),
});

export const disposalcategorycaterorSchema = z.object({
  disposalName: z.string().min(1, 'Disposal category name is required'),
});

const updatedisposalcategorySchema = z.object({
  disposalCategoryName: z
    .string({required_error: 'Utensil Category is required'})
    .min(3, {message: 'Utensil Category must be at least 3 characters long'}),
});

const updatedisposalSchema = z.object({
  disposalName: z
    .string({required_error: 'Utensil Category is required'})
    .min(3, {message: 'Utensil Category must be at least 3 characters long'}),
});

export {
  disposalSchema,
  disposalSchemaa,
  updatedisposalcategorySchema,
  updatedisposalSchema,
};
