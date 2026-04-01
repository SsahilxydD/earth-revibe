'use client';

import { redirect } from 'next/navigation';

// OAuth callback is no longer used — auth is handled via WhatsApp OTP.
export default function AuthCallbackPage() {
  redirect('/auth/login');
}
