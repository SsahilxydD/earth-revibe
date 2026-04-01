'use client';

import { redirect } from 'next/navigation';

// Registration is handled via the OTP login flow — phone login auto-creates accounts.
export default function RegisterPage() {
  redirect('/auth/login');
}
