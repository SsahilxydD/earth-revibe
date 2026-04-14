'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Providers } from '@/providers';
import { PrefetchProvider } from '@/providers/prefetch-provider';
import { PostHogProvider, PostHogPageview } from '@/providers/posthog-provider';
import { LenisProvider } from '@/providers/lenis-provider';

/**
 * Conditional wrapper: storefront providers (Lenis smooth-scroll, CartDrawer,
 * PostHog, AuthInitializer, Prefetch) run ONLY for shop/auth routes. The
 * /apply-for-trip-form route gets a bare tree — none of the storefront shell
 * leaks into the Travel Circle application flow.
 *
 * Why this matters:
 *  - Lenis intercepts wheel/touch events and fights the mobile frame scroll
 *  - CartDrawer is a fixed-position element that can peek through on small screens
 *  - PrefetchProvider auto-prefetches links which is noise on a standalone form
 *  - AuthInitializer fires storefront login checks the applicant doesn't need
 */
export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApplyRoute = pathname?.startsWith('/apply-for-trip-form') ?? false;

  if (isApplyRoute) {
    // Bare tree — the (apply)/layout.tsx provides its own scoped styles + fonts.
    return <>{children}</>;
  }

  return (
    <PostHogProvider>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      <Providers>
        <PrefetchProvider>
          <LenisProvider>{children}</LenisProvider>
        </PrefetchProvider>
      </Providers>
    </PostHogProvider>
  );
}
