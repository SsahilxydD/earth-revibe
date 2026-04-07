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

  /** Whether swipe is available (has adjacent products) */
  const { prev, next } = getAdjacentSlugs(currentSlug);
  const canSwipe = prev !== null || next !== null;
  const canSwipeLeft = next !== null;
  const canSwipeRight = prev !== null;

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
