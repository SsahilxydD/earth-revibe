// Thin wrappers around the existing earthrevibe.com WhatsApp OTP auth flow.
// Since the apply page lives on the same origin as the rest of the storefront,
// the httpOnly cookies set by /auth/verify-otp apply automatically here — no
// CORS, no separate auth state. This file MUST NOT change any auth behavior.
import { api } from '@/lib/api-client';
import { sendOtpSchema, verifyOtpSchema } from '@earth-revibe/shared';

function toE164(phone: string): string {
  return `+91${phone}`;
}

interface ApiError {
  status: number;
  code: string;
  message: string;
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
