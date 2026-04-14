import type { FormData } from './types';
import { api, type ApiError } from './api-client';
import {
  travelApplicationSubmitSchema,
  type TravelApplicationResponse,
} from '@earth-revibe/shared';

/**
 * Submit the completed application to the API. The user is already
 * authenticated via the WhatsApp OTP flow (cookies set by verify-otp),
 * so this request rides on the same session via `credentials: include`.
 */
export async function submitApplication(data: FormData): Promise<TravelApplicationResponse> {
  // Drop transient UI-only fields + reshape to the API contract.
  const payload = {
    phone: `+91${data.phone}`,
    name: data.name,
    age: data.age,
    city: data.city,
    instagram: data.instagram,
    travelerType: data.travelerType!,
    whyJoin: data.whyJoin,
    pastTravel: data.pastTravel!,
    tripPrefs: data.tripPrefs,
    meetBefore: data.meetBefore!,
    curated: data.curated!,
  };

  // Validate before we burn a round-trip — the server re-validates too.
  const parsed = travelApplicationSubmitSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Application is incomplete');
  }

  try {
    return await api.post<TravelApplicationResponse>('/travel-applications', parsed.data);
  } catch (err) {
    throw new Error((err as ApiError).message || 'Could not submit application');
  }
}
