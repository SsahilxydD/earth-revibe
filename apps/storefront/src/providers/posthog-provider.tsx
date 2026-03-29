'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!POSTHOG_KEY || initialized.current) return;
    initialized.current = true;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // we handle this manually for SPA navigation
      capture_pageleave: true,
    });
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

/** Tracks client-side route changes as pageviews. Place once inside the provider tree. */
export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    ph.capture('$pageview', { $current_url: window.origin + url });
  }, [pathname, searchParams, ph]);

  return null;
}
