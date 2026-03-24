"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { productKeys } from "./use-products";
import { useProductNavStore } from "@/stores/product-nav-store";
import { api } from "@/lib/api-client";
import type { Product } from "@/types";

export function usePrefetchAdjacentProducts(currentSlug: string) {
  const queryClient = useQueryClient();
  const slugs = useProductNavStore((s) => s.slugs);
  const getAdjacentSlugs = useProductNavStore((s) => s.getAdjacentSlugs);
  const { prev, next } = getAdjacentSlugs(currentSlug);

  useEffect(() => {
    // Prefetch immediate neighbors + one step further for rapid swiping
    const toPrefetch = new Set<string>();
    if (prev) {
      toPrefetch.add(prev);
      const { prev: prevPrev } = getAdjacentSlugs(prev);
      if (prevPrev) toPrefetch.add(prevPrev);
    }
    if (next) {
      toPrefetch.add(next);
      const { next: nextNext } = getAdjacentSlugs(next);
      if (nextNext) toPrefetch.add(nextNext);
    }

    toPrefetch.forEach((slug) => {
      queryClient.prefetchQuery({
        queryKey: productKeys.detail(slug),
        queryFn: ({ signal }) => api.get<Product>(`/products/${slug}`, signal),
        staleTime: 10 * 60 * 1000,
      });
    });
  }, [prev, next, queryClient, slugs, getAdjacentSlugs]);
}
