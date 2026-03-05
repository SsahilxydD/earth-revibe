import { z } from "zod";

export const updateReferralConfigSchema = z.object({
  referrerReward: z.coerce.number().int().min(0),
  refereeReward: z.coerce.number().int().min(0),
  requirePurchase: z.boolean(),
  isActive: z.boolean(),
});

export type UpdateReferralConfigInput = z.infer<typeof updateReferralConfigSchema>;
