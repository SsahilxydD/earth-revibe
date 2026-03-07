import { z } from "zod";
import { DiscountType } from "../enums";

export const createDiscountSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(DiscountType),
  value: z.coerce.number().positive(),
  minOrderValue: z.coerce.number().positive().optional(),
  maxDiscountAmount: z.coerce.number().positive().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  applicableCategories: z.array(z.string()).default([]),
  applicableProducts: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});

export const updateDiscountSchema = createDiscountSchema.partial();

export const validateDiscountSchema = z.object({
  code: z.string().min(1),
  orderTotal: z.coerce.number().positive(),
});

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
export type ValidateDiscountInput = z.infer<typeof validateDiscountSchema>;
