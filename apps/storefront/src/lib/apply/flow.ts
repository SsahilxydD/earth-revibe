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
  'travelerType',
  'whyJoin',
  'pastTravel',
  'tripPrefs',
  'meetBefore',
  'curated',
  'submitted',
] as const;

/** Q-number (1-based) for screens that count toward the 10-question progress. */
export const QUESTION_INDEX: Partial<Record<Step, number>> = {
  name: 1,
  age: 2,
  city: 3,
  instagram: 4,
  travelerType: 5,
  whyJoin: 6,
  pastTravel: 7,
  tripPrefs: 8,
  meetBefore: 9,
  curated: 10,
};

export const TOTAL_QUESTIONS = 10;

export function nextStep(current: Step): Step {
  const i = ORDER.indexOf(current);
  return ORDER[Math.min(i + 1, ORDER.length - 1)];
}

export function prevStep(current: Step): Step {
  const i = ORDER.indexOf(current);
  return ORDER[Math.max(i - 1, 0)];
}
