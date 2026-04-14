import type { FormData } from './types';
import { api } from '@/lib/api-client';
import {
  travelApplicationSubmitSchema,
  type TravelApplicationResponse,
} from '@earth-revibe/shared';

interface ApiError {
  status: number;
  code: string;
  message: string;
}

/**
 * Submit the completed application to the API. The user is already
 * authenticated via the WhatsApp OTP flow (cookies set by verify-otp),
 * and because the apply page is same-origin, cookies ride along naturally.
 */
export async function submitApplication(data: FormData): Promise<TravelApplicationResponse> {
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
