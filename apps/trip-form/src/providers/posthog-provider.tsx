'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useFlow } from '@/lib/store';
import { QUESTION_INDEX, TOTAL_QUESTIONS } from '@/lib/flow';

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
      capture_pageview: false, // we handle pageview + step tracking manually
      capture_pageleave: true,
      defaults: '2026-01-30',
      // Stamp every event with app=trip-form so the shared PostHog project
      // can slice this app's traffic into its own dashboard via a global
      // `app = trip-form` filter. Affects $pageview/$pageleave and every
      // capture() call — no per-event tagging needed downstream.
      loaded: (ph) => {
        ph.register({ app: 'trip-form' });
      },
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

/**
 * The trip-form flow is a single Next route — step changes live in zustand.
 * Emit a funnel event on every step transition so PostHog can chart drop-off
 * per question. Runs once per step change; skips the initial welcome screen.
 */
export function PostHogStepTracker() {
  const step = useFlow((s) => s.step);
  const ph = usePostHog();
  const lastStep = useRef<string | null>(null);

  useEffect(() => {
    if (!ph) return;
    if (lastStep.current === step) return;
    lastStep.current = step;

    ph.capture('application_step_viewed', {
      step,
      question_index: QUESTION_INDEX[step] ?? null,
      total_questions: TOTAL_QUESTIONS,
    });
  }, [step, ph]);

  return null;
}
