import { z } from "zod";

export const updateLoyaltyConfigSchema = z.object({
  pointsPerRupee: z.coerce.number().positive(),
  pointRedemptionValue: z.coerce.number().positive(),
  welcomeBonus: z.coerce.number().int().min(0),
  reviewBonus: z.coerce.number().int().min(0),
  birthdayBonus: z.coerce.number().int().min(0),
  minRedeemPoints: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export type UpdateLoyaltyConfigInput = z.infer<typeof updateLoyaltyConfigSchema>;
