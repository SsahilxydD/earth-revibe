import { z } from 'zod';
import { TRAVELER_TYPES, TRIP_PREFS, YES_NO, YES_MAYBE_NO } from '../enums/travel-application.enum';

// Flow step identifiers — used by the trip-form client flow controller.
export const travelApplicationStepSchema = z.enum([
  'gate',
  'otp',
  'welcome',
  'name',
  'age',
  'city',
  'instagram',
  'travelerType',
  'whyJoin',
  'pastTravel',
  'tripPrefs',
  'meetBefore',
  'curated',
  'submitted',
]);
export type TravelApplicationStep = z.infer<typeof travelApplicationStepSchema>;

// ── Submit payload ──────────────────────────────────────────────────────────
// Applicant profile collected across the 14 screens. Phone is expected as the
// +91-prefixed E.164 form (matches sendOtpSchema / verifyOtpSchema).
export const travelApplicationSubmitSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian mobile number. Use +91 followed by 10 digits.'),
  name: z.string().trim().min(2, 'Enter your name').max(80),
  age: z
    .string()
    .regex(/^\d{1,2}$/, 'Enter a valid age')
    .refine((v) => {
      const n = Number(v);
      return n >= 16 && n <= 99;
    }, 'Age must be between 16 and 99'),
  city: z.string().trim().min(2, 'Enter your city').max(80),
  instagram: z
    .string()
    .trim()
    .min(1, 'Enter your Instagram handle')
    .max(40)
    .regex(/^@?[A-Za-z0-9._]+$/, 'Invalid Instagram handle'),
  travelerType: z.enum(TRAVELER_TYPES),
  whyJoin: z.string().trim().min(8, 'Tell us a bit more').max(500),
  pastTravel: z.enum(YES_NO),
  tripPrefs: z.array(z.enum(TRIP_PREFS)).min(1, 'Pick at least one'),
  meetBefore: z.enum(YES_MAYBE_NO),
  curated: z.enum(YES_NO),
});

export type TravelApplicationSubmitInput = z.infer<typeof travelApplicationSubmitSchema>;

// Response after a successful submission.
export const travelApplicationResponseSchema = z.object({
  id: z.string(),
  applicationNumber: z.string(), // e.g. "ER-2026-0042"
});
export type TravelApplicationResponse = z.infer<typeof travelApplicationResponseSchema>;
