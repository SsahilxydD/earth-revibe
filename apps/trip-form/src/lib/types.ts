export type Step =
  | 'gate'
  | 'otp'
  | 'welcome'
  | 'name'
  | 'age'
  | 'city'
  | 'instagram'
  | 'email'
  | 'travelerType'
  | 'whyJoin'
  | 'pastTravel'
  | 'tripPrefs'
  | 'meetBefore'
  | 'curated'
  | 'submitted';

export type TravelerTypeId = 'chill' | 'party' | 'explorer' | 'mix';
export type TripPrefId = 'mountains' | 'beaches' | 'weekend' | 'luxury';
export type YesNo = 'yes' | 'no';
export type YesMaybeNo = 'yes' | 'maybe' | 'no';

export type FormData = {
  // Auth gate
  phone: string; // local part only, e.g. "9876543210"
  phoneVerified: boolean;
  otp: string; // 6 digits

  // Profile
  name: string;
  age: string;
  city: string;
  instagram: string;
  email: string;

  // Preferences
  travelerType: TravelerTypeId | null;
  whyJoin: string;
  pastTravel: YesNo | null;
  tripPrefs: TripPrefId[];
  meetBefore: YesMaybeNo | null;
  curated: YesNo | null;

  // Submission
  applicationId: string | null;
};
