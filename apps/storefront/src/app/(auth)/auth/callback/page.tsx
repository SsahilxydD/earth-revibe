'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="h-8 w-8" />
          <p className="mt-4 text-sm text-[var(--color-muted)]">Signing you in...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // After Google OAuth, Supabase redirects here with ?code=... (PKCE)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange failed:', error.message);
            router.replace('/auth/login');
            return;
          }
        }

        // Session is now in Supabase localStorage.
        // The api-client reads it and sends as Bearer token on every request.
        // checkAuth() calls GET /auth/me which auto-provisions the Prisma user.
        await checkAuth();

        router.replace('/');
      } catch (err) {
        console.error('Auth callback error:', err);
        router.replace('/auth/login');
      }
    };

    handleCallback();
  }, [router, checkAuth]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner className="h-8 w-8" />
      <p className="mt-4 text-sm text-[var(--color-muted)]">Signing you in...</p>
    </div>
  );
}
