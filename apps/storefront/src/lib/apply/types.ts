// All canonical types live in @earth-revibe/shared. This file re-exports the
// trip-form–specific ones and defines the UI-only FormData shape that carries
// a few transient fields (unverified phone + otp) that never hit the API.
import type { TravelerType, TripPref, YesNo, YesMaybeNo } from '@earth-revibe/shared';

export type {
  TravelApplicationStep as Step,
  TravelApplicationSubmitInput,
  TravelApplicationResponse,
  TravelerType,
  TripPref,
  YesNo,
  YesMaybeNo,
} from '@earth-revibe/shared';

// Aliases kept for backwards-compat with existing screen imports
export type TravelerTypeId = TravelerType;
export type TripPrefId = TripPref;

export type FormData = {
  // Auth gate
  phone: string; // local 10-digit part — +91 is prepended when calling the auth API
  phoneVerified: boolean;
  otp: string; // 6 digits

  // Profile
  name: string;
  age: string;
  city: string;
  instagram: string;

  // Preferences
  travelerType: TravelerType | null;
  whyJoin: string;
  pastTravel: YesNo | null;
  tripPrefs: TripPref[];
  meetBefore: YesMaybeNo | null;
  curated: YesNo | null;

  // Submission
  applicationId: string | null;
  applicationNumber: string | null;
};
