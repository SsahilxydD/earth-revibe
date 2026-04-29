/**
 * WhatsApp OTP wrappers — call the existing earthrevibe.com auth endpoints.
 * Same contract as trip-form: send-otp triggers a WA template message; verify-otp
 * sets httpOnly access/refresh cookies and upserts the User row, so anyone who
 * makes it past the gate is already a customer record server-side.
 */
import { sendOtpSchema, verifyOtpSchema } from '@earth-revibe/shared';
import { api, type ApiError } from './api-client';

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
