import { z } from 'zod';

export const updateReferralConfigSchema = z.object({
  referrerReward: z.coerce.number().int().min(0),
  refereeReward: z.coerce.number().int().min(0),
  requirePurchase: z.boolean(),
  isActive: z.boolean(),
});

export type UpdateReferralConfigInput = z.infer<typeof updateReferralConfigSchema>;

// Referrer's UPI VPA for receiving referral cash payouts (e.g. "name@okhdfc").
export const updateUpiSchema = z.object({
  upiId: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a valid UPI ID (e.g. name@bank)'),
});
export type UpdateUpiInput = z.infer<typeof updateUpiSchema>;

// Admin marks a referral cash payout as paid; optional reference (UPI txn id / note).
export const markReferralPaidSchema = z.object({
  payoutRef: z.string().trim().max(120).optional(),
});
export type MarkReferralPaidInput = z.infer<typeof markReferralPaidSchema>;
