'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Runs checkAuth() once on app mount to restore session from httpOnly cookies.
 * Without this, the Zustand auth store resets to null on every page load.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}
