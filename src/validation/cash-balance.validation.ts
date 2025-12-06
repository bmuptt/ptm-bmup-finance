import { z } from 'zod';

export const updateCashBalanceSchema = z.object({
  status: z.boolean({
    message: 'Status is required!',
  }),
  value: z
    .number({
      message: 'Value is required!',
    })
    .positive('Value must be greater than 0!'),
  description: z
    .string({
      message: 'Description is required!',
    })
    .min(1, 'Description is required!'),
});

export const historyBalanceQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1!').max(100, 'Limit must not be greater than 100!').optional(),
});
