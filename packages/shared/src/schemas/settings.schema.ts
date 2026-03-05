import { z } from "zod";

export const updateStoreSettingsSchema = z.object({
  storeName: z.string().min(2).max(100).optional(),
  logo: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  socialInstagram: z.string().url().optional(),
  socialFacebook: z.string().url().optional(),
  socialTwitter: z.string().url().optional(),
  freeShippingThreshold: z.coerce.number().positive().optional(),
  gstRate: z.coerce.number().min(0).max(100).optional(),
  returnWindowDays: z.coerce.number().int().min(0).optional(),
});

export const shippingZoneSchema = z.object({
  name: z.string().min(2).max(100),
  states: z.array(z.string().min(2)),
  rate: z.coerce.number().min(0),
  minDays: z.coerce.number().int().min(1),
  maxDays: z.coerce.number().int().min(1),
  isActive: z.boolean().default(true),
});

export const createAdminUserSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "SUPPORT_STAFF"]),
});

export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;
export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
