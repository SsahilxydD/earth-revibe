'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { useProductNavStore } from '@/stores/product-nav-store';
import { trackProductViewed } from '@/lib/analytics';
import { api } from '@/lib/api-client';
import type { Product } from '@/types';

interface UseSwipeNavigationOptions {
  currentSlug: string;
}

export function useSwipeNavigation({ currentSlug }: UseSwipeNavigationOptions) {
  const queryClient = useQueryClient();
  const getAdjacentSlugs = useProductNavStore((s) => s.getAdjacentSlugs);
  // Subscribe to slug arrays so we re-render when the nav store is populated
  const allSlugs = useProductNavStore((s) => s.allSlugs);
  const ctxSlugs = useProductNavStore((s) => s.slugs);

  /** Prefetch adjacent products into React Query cache */
  const prefetchAdjacent = useCallback(
    (slug: string) => {
      const { prev, next } = getAdjacentSlugs(slug);
      const prefetch = (s: string) =>
        queryClient.prefetchQuery({
          queryKey: productKeys.detail(s),
          queryFn: ({ signal }) => api.get<Product>(`/products/${s}`, signal),
          staleTime: 5 * 60 * 1000,
        });
      if (prev) prefetch(prev);
      if (next) prefetch(next);
    },
    [getAdjacentSlugs, queryClient]
  );

  /** Get the cached product for a slug, or null if not prefetched */
  const getCachedProduct = useCallback(
    (slug: string): Product | undefined => {
      return queryClient.getQueryData<Product>(productKeys.detail(slug));
    },
    [queryClient]
  );

  /** Called after the spring animation finishes — updates URL, analytics, prefetches */
  const completeSwipe = useCallback(
    (newSlug: string, newProduct: Product) => {
      // Push URL so browser Back navigates between swiped products
      window.history.pushState(null, '', `/products/${newSlug}`);
      document.title = `${newProduct.name} | Earth Revibe`;

      trackProductViewed({
        id: newProduct.id,
        name: newProduct.name,
        price: newProduct.price,
        category: newProduct.category?.name,
      });

      prefetchAdjacent(newSlug);
    },
    [prefetchAdjacent]
  );

  /** Whether swipe is available — derived from subscribed slug arrays for reactivity */
  const slugList = ctxSlugs.length > 1 ? ctxSlugs : allSlugs;
  const hasSiblings = slugList.length > 1;
  const { prev, next } = getAdjacentSlugs(currentSlug);
  const canSwipe = hasSiblings && (prev !== null || next !== null);
  const canSwipeLeft = hasSiblings && next !== null;
  const canSwipeRight = hasSiblings && prev !== null;

  return {
    canSwipe,
    canSwipeLeft,
    canSwipeRight,
    completeSwipe,
    prefetchAdjacent,
    getCachedProduct,
    getAdjacentSlugs,
  };
}
