import { z } from 'zod';
import { ExpenseCategory } from '../enums';

// An operating cost recorded by an admin (light bill, logistics, rent, ...).
// `incurredAt` is the date the cost applies to — what the P&L date range buckets
// by (distinct from the row's createdAt). Sent from the client as an ISO string
// and coerced to a Date, mirroring discount.schema's date handling.
export const createExpenseSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(120),
  category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.OTHER),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  incurredAt: z.coerce.date(),
  note: z.string().max(500).optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
