import { travelApplicationSubmitSchema } from '@earth-revibe/shared';
import { api, type ApiError } from './api-client';
import type { FormData } from './types';

/**
 * Submit the completed application to the API. Kept with the original
 * `{ id }` return shape so the UI (Curated/Submitted) stays byte-identical
 * to the standalone version — we pass the human-readable applicationNumber
 * (e.g. "ER-2026-0042") through as `id` since that's what the final screen
 * displays.
 */
export async function submitApplication(data: FormData): Promise<{ id: string }> {
  const payload = {
    phone: `+91${data.phone}`,
    name: data.name,
    age: data.age,
    city: data.city,
    instagram: data.instagram,
    email: data.email,
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
    const result = await api.post<{ id: string; applicationNumber: string }>(
      '/travel-applications',
      parsed.data
    );
    return { id: result.applicationNumber };
  } catch (err) {
    throw new Error((err as ApiError).message || 'Could not submit application');
  }
}
