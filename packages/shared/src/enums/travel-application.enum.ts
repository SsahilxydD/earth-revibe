export const TRAVELER_TYPES = ['chill', 'party', 'explorer', 'mix'] as const;
export type TravelerType = (typeof TRAVELER_TYPES)[number];

export const TRIP_PREFS = ['mountains', 'beaches', 'weekend', 'luxury'] as const;
export type TripPref = (typeof TRIP_PREFS)[number];

export const YES_NO = ['yes', 'no'] as const;
export type YesNo = (typeof YES_NO)[number];

export const YES_MAYBE_NO = ['yes', 'maybe', 'no'] as const;
export type YesMaybeNo = (typeof YES_MAYBE_NO)[number];

export const TRAVEL_APPLICATION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WAITLISTED',
] as const;
export type TravelApplicationStatus = (typeof TRAVEL_APPLICATION_STATUSES)[number];
