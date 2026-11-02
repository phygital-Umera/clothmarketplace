import {z} from 'zod';

const languageSchema = z.object({
  name: z
    .string({required_error: 'Language is required'})
    .min(3, {message: 'Language must be at least 3 characters long'}),

  code: z
    .string({required_error: 'Code is required'})
    .min(3, {message: 'Code must be at least 3 characters long'}),
});

export {languageSchema};
