import type { Step } from './types';

/** Strict order — every transition in the app flows through this array. */
export const ORDER: readonly Step[] = [
  'gate',
  'otp',
  'welcome',
  'name',
  'age',
  'city',
  'instagram',
  'email',
  'travelerType',
  'whyJoin',
  'pastTravel',
  'tripPrefs',
  'meetBefore',
  'curated',
  'submitted',
] as const;

/** Q-number (1-based) for screens that count toward the 11-question progress. */
export const QUESTION_INDEX: Partial<Record<Step, number>> = {
  name: 1,
  age: 2,
  city: 3,
  instagram: 4,
  email: 5,
  travelerType: 6,
  whyJoin: 7,
  pastTravel: 8,
  tripPrefs: 9,
  meetBefore: 10,
  curated: 11,
};

export const TOTAL_QUESTIONS = 11;

export function nextStep(current: Step): Step {
  const i = ORDER.indexOf(current);
  return ORDER[Math.min(i + 1, ORDER.length - 1)];
}

export function prevStep(current: Step): Step {
  const i = ORDER.indexOf(current);
  return ORDER[Math.max(i - 1, 0)];
}
