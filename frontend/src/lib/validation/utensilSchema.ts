import {z} from 'zod';

const utensilcategorySchema = z.object({
  utensilCategoryName: z
    .string({required_error: 'Utensil Category is required'})
    .min(3, {message: 'Utensil Category must be at least 3 characters long'}),

  language: z.string({required_error: 'Language is required'}),
});

const utensilcategorycaterorSchema = z.object({
  utensilCategoryName: z
    .string({required_error: 'Utensil Category is required'})
    .min(3, {message: 'Utensil Category must be at least 3 characters long'}),
});

const utensilSchema = z.object({
  utensilName: z
    .string({required_error: 'Utensil Name is required'})
    .min(3, {message: 'Utensil Name must be at least 3 characters long'}),

  utensilCategory: z.string({required_error: 'Utensil Category is required'}),
});

const updateutensilcategorySchema = z.object({
  utensilCategoryName: z
    .string({required_error: 'Utensil Category is required'})
    .min(3, {message: 'Utensil Category must be at least 3 characters long'}),
});

const updateutensilSchema = z.object({
  utensilName: z
    .string({required_error: 'Utensil Category is required'})
    .min(3, {message: 'Utensil Category must be at least 3 characters long'}),
});

export {
  utensilcategorySchema,
  utensilSchema,
  updateutensilcategorySchema,
  updateutensilSchema,
  utensilcategorycaterorSchema,
};
