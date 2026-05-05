'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@earth-revibe/ui/spinner';
import { useAuthStore } from '@/stores/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const checkedRef = useRef(false);

  // Tab-resume refreshes handled by api-client.ts to avoid racing token rotation
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-off-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-deep-earth" />
          <p className="text-sm text-medium-gray">
            {isLoading ? 'Loading admin panel...' : 'Redirecting...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
