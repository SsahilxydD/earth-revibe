'use client';

/**
 * Previously prefetched the categories list for filter UI. After the
 * categories surface was removed (vibes are the new filter), there is
 * nothing worth prefetching at app boot — product data is fetched
 * on-demand by TanStack Query with reasonable staleTime/gcTime.
 *
 * Kept as a pass-through so providers/index.ts wiring remains stable.
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
