'use client';

import type { ReactNode } from 'react';

/**
 * Passthrough — no animation. Framer Motion page transitions cause
 * SSR/client opacity mismatches (server renders 100%, client starts
 * at 85% then animates). This is worse than no transition at all.
 * The staleTimes + React Query cache eliminates the need for transitions.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
