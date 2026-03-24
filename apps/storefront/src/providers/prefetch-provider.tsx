"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { productKeys } from "@/hooks/use-products";
import type { Product, Category } from "@/types";

/**
 * Prefetches ALL products and categories into React Query cache on app load.
 * The site is small (~50MB total) so we load everything upfront into memory.
 * After this runs, every page navigation has data instantly — zero network fetch.
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    // Prefetch all categories
    queryClient.prefetchQuery({
      queryKey: productKeys.categories,
      queryFn: () => api.get<Category[]>("/categories"),
      staleTime: 30 * 60 * 1000, // 30 min
    });

    // Prefetch ALL products (paginated — fetch all pages)
    const prefetchAllProducts = async () => {
      try {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const res: any = await api.get(`/products?page=${page}&limit=50`);

          const products = res?.products || [];

          // Cache each individual product by slug for instant detail page loads
          if (Array.isArray(products)) {
            products.forEach((product: Product) => {
              if (product?.slug) {
                queryClient.setQueryData(
                  productKeys.detail(product.slug),
                  product,
                );
              }
            });
          }

          // API returns { products, total, page, limit, totalPages }
          const totalPages = res?.totalPages || 1;
          if (page < totalPages) {
            page++;
          } else {
            hasMore = false;
          }
        }
      } catch {
        // Silently fail — prefetch is best-effort
      }
    };

    // Run after a short delay so it doesn't block initial render
    const timer = setTimeout(prefetchAllProducts, 1000);
    return () => clearTimeout(timer);
  }, [queryClient]);

  return <>{children}</>;
}
