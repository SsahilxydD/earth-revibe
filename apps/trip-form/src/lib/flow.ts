import type { Step } from './types';

/** Strict order — every transition in the app flows through this array. */
export const ORDER: readonly Step[] = [
  'welcome',
  'travelerType', // 1 / 8
  'pastTravel', // 2 / 8
  'tripPrefs', // 3 / 8
  'meetBefore', // 4 / 8
  'basicProfile', // 5 / 8 — name + age + city
  'contact', // 6 / 8 — instagram + email
  'whyJoin', // 7 / 8
  'curated', // 8 / 8
  'gate', // phone entry
  'otp', // phone verification (submit fires here on success)
  'submitted',
] as const;

/**
 * Page number (1-based) for screens that show a progress pill like "03 / 08".
 * Only the 8 question pages count — welcome, gate, otp, submitted are off-count.
 */
export const QUESTION_INDEX: Partial<Record<Step, number>> = {
  travelerType: 1,
  pastTravel: 2,
  tripPrefs: 3,
  meetBefore: 4,
  basicProfile: 5,
  contact: 6,
  whyJoin: 7,
  curated: 8,
};

export const TOTAL_QUESTIONS = 8;

export function nextStep(current: Step): Step {
  const i = ORDER.indexOf(current);
  return ORDER[Math.min(i + 1, ORDER.length - 1)];
}

export function prevStep(current: Step): Step {
  const i = ORDER.indexOf(current);
  return ORDER[Math.max(i - 1, 0)];
}
