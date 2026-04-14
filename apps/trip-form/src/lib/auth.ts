// Thin wrappers around the existing earthrevibe.com WhatsApp OTP auth flow.
// The API sets httpOnly access/refresh cookies on verify, so the subsequent
// submit call is authenticated automatically via `credentials: include`.
// NOTE: this file MUST NOT change any auth behavior — it only consumes the
// existing /api/v1/auth/send-otp and /api/v1/auth/verify-otp endpoints.
import { api, type ApiError } from './api-client';
import { sendOtpSchema, verifyOtpSchema } from '@earth-revibe/shared';

function toE164(phone: string): string {
  return `+91${phone}`;
}

export async function sendWhatsAppCode(phone: string): Promise<void> {
  const parsed = sendOtpSchema.safeParse({ phone: toE164(phone) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid phone number');
  }
  try {
    await api.post('/auth/send-otp', parsed.data);
  } catch (err) {
    throw new Error((err as ApiError).message || 'Could not send WhatsApp code');
  }
}

export async function verifyWhatsAppCode(phone: string, code: string): Promise<boolean> {
  const parsed = verifyOtpSchema.safeParse({ phone: toE164(phone), code });
  if (!parsed.success) return false;
  try {
    await api.post('/auth/verify-otp', parsed.data);
    return true;
  } catch {
    return false;
  }
}
