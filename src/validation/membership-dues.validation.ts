import { z } from 'zod';

export const payDuesSchema = z.object({
  member_id: z.coerce.number({
    message: 'Member ID must be a number!',
  }).positive('Member ID must be a positive number!'),
  
  period_year: z.coerce.number({
    message: 'Period year must be a number!',
  }).int().min(2000, 'Period year must be at least 2000!').max(2100, 'Period year must be at most 2100!'),
  
  period_month: z.coerce.number({
    message: 'Period month must be a number!',
  }).int().min(1, 'Period month must be between 1 and 12!').max(12, 'Period month must be between 1 and 12!'),
  
  status: z.enum(['paid', 'unpaid'], {
    message: "Status must be 'paid' or 'unpaid'!",
  }),
});

export const uploadDuesSchema = z.object({
  status_file: z.coerce.number({
    message: 'status_file is required!',
  }).int().refine((v) => v === 0 || v === 1, {
    message: 'status_file must be 0 or 1!',
  }),
});

export const duesIdParamSchema = z.object({
  id: z.coerce.number({
    message: 'ID must be a number!',
  }).int().positive('ID must be a positive number!'),
});

