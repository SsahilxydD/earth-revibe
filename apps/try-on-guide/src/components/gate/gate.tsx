'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useGate } from '@/lib/gate-store';
import { PhoneScreen } from './phone-screen';
import { OtpScreen } from './otp-screen';

export function Gate({ children }: { children: ReactNode }) {
  // zustand-persist hydrates from localStorage on mount, so until that finishes
  // we render a blank canvas to avoid the gate flashing for already-verified users.
  const [hydrated, setHydrated] = useState(false);
  const verified = useGate((s) => s.verified);
  const step = useGate((s) => s.step);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="min-h-dvh w-full bg-white" aria-hidden />;
  }

  if (verified) {
    return <>{children}</>;
  }

  return step === 'otp' ? <OtpScreen /> : <PhoneScreen />;
}
