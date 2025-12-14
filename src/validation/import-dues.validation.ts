import { z } from 'zod';

export const importDuesSchema = z.object({
  period_year: z.coerce.number({
    message: 'Period year is required!',
  }).int().min(2000, 'Period year must be at least 2000!').max(2100, 'Period year must be at most 2100!'),
});

