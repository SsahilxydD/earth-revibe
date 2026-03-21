"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { productKeys } from "./use-products";
import { useProductNavStore } from "@/stores/product-nav-store";
import { api } from "@/lib/api-client";
import type { Product } from "@/types";

export function usePrefetchAdjacentProducts(currentSlug: string) {
  const queryClient = useQueryClient();
  const getAdjacentSlugs = useProductNavStore((s) => s.getAdjacentSlugs);
  const { prev, next } = getAdjacentSlugs(currentSlug);

  useEffect(() => {
    if (prev) {
      queryClient.prefetchQuery({
        queryKey: productKeys.detail(prev),
        queryFn: ({ signal }) => api.get<Product>(`/products/${prev}`, signal),
        staleTime: 10 * 60 * 1000, // 10 min — keep in cache for rapid swiping
      });
    }
    if (next) {
      queryClient.prefetchQuery({
        queryKey: productKeys.detail(next),
        queryFn: ({ signal }) => api.get<Product>(`/products/${next}`, signal),
        staleTime: 10 * 60 * 1000, // 10 min — keep in cache for rapid swiping
      });
    }
  }, [prev, next, queryClient]);
}
