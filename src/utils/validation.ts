import { z } from 'zod';

// Common validation schemas
export const idSchema = z.string().min(1, 'ID is required');

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const createItemSchema = z.object({
  name: z.string({ message: 'Name is required!' }).min(1, 'Name is required!').max(255, 'Name is too long!'),
  description: z.string({ message: 'Description is required!' }).min(1, 'Description is required!').max(1000, 'Description is too long!'),
});

export const updateItemSchema = z.object({
  name: z.string({ message: 'Name is required!' }).min(1, 'Name is required!').max(255, 'Name is too long!'),
  description: z.string({ message: 'Description is required!' }).min(1, 'Description is required!').max(1000, 'Description is too long!'),
});

// Validation middleware factory
export const validate = (schema: z.ZodSchema, target: 'body' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    try {
      const dataToValidate = target === 'body' ? req.body : req.params;
      schema.parse(dataToValidate);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          errors: error.issues.map(err => err.message),
        });
      } else {
        next(error);
      }
    }
  };
};
