'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { productKeys } from '@/hooks/use-products';
import type { Category } from '@/types';

/**
 * LIGHTWEIGHT PREFETCH
 *
 * Only prefetches categories (tiny JSON, ~1KB) on first load.
 * Product data is fetched on-demand when pages are visited and
 * cached by TanStack Query with reasonable staleTime/gcTime.
 *
 * Previous version loaded the ENTIRE catalog into memory (all products,
 * all details, all images) causing 1GB+ memory usage. Now the site
 * only loads what the user actually views.
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    // Prefetch categories — they're used by filters and nav, tiny payload
    queryClient.prefetchQuery({
      queryKey: productKeys.categories,
      queryFn: ({ signal }) => api.get<Category[]>('/categories', signal),
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  return <>{children}</>;
}
