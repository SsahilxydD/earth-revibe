import { z } from 'zod';

// Claiming a QR/scan promo. The campaign `code` comes from the /spinner landing
// (e.g. "SCAN500"); the user is taken from the authenticated session.
export const claimPromoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Missing promo code')
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid promo code'),
});
export type ClaimPromoInput = z.infer<typeof claimPromoSchema>;
