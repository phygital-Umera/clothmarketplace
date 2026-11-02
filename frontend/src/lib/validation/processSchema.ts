import {z} from 'zod';

const processSchema = z.object({
  name: z
    .string({required_error: 'Disposal Name is required'})
    .min(3, {message: 'Disposal Name must be at least 3 characters long'}),
  languageId: z.string(),
});

const updateprocessSchema = z.object({
  name: z
    .string({required_error: 'Disposal Name is required'})
    .min(3, {message: 'Disposal Name must be at least 3 characters long'}),
});

export {processSchema, updateprocessSchema};
