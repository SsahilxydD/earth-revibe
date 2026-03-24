"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { productKeys } from "@/hooks/use-products";
import { useProductNavStore } from "@/stores/product-nav-store";
import type { Product, Category } from "@/types";

/**
 * AGGRESSIVE MEMORY PREFETCH
 *
 * Loads the ENTIRE catalog into browser memory on first page load:
 * - All categories (JSON)
 * - All products with full details (JSON)
 * - All product images (preloaded into browser image cache)
 * - Homepage sections
 *
 * After ~3-5s, the entire site is in memory. Every navigation is instant.
 * Total memory: ~2-5MB JSON + ~30-50MB images (browser cache managed).
 */

/** Preload an image into browser memory cache */
function preloadImage(url: string) {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const setAllSlugs = useProductNavStore((s) => s.setAllSlugs);
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    const loadEverything = async () => {
      try {
        // ─── 1. Categories ───────────────────────────────────────
        const categories = await api.get<Category[]>("/categories");
        queryClient.setQueryData(productKeys.categories, categories);

        // ─── 2. ALL products ─────────────────────────────────────
        const allProducts: Product[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const res: any = await api.get(`/products?page=${page}&limit=100`);
          const products = res?.products || [];

          if (Array.isArray(products)) {
            for (const product of products) {
              if (!product?.slug) continue;
              allProducts.push(product);

              // Preload images from list response
              const images = product.images || [];
              for (const img of images) {
                if (img?.url) preloadImage(img.url);
                if (img?.thumbnailUrl) preloadImage(img.thumbnailUrl);
              }
            }
          }

          const totalPages = res?.totalPages || 1;
          page < totalPages ? page++ : (hasMore = false);
        }

        // ─── 3. Fetch FULL product details (with variants) for each product ──
        // List endpoint doesn't include variants — detail page needs them
        for (const product of allProducts) {
          // Only fetch if not already cached with full data
          const cached = queryClient.getQueryData(productKeys.detail(product.slug));
          if (cached && (cached as any).variants) continue;

          try {
            const full = await api.get<Product>(`/products/${product.slug}`);
            queryClient.setQueryData(productKeys.detail(product.slug), full);

            // Preload full product images
            const fullImages = (full as any)?.images || [];
            for (const img of fullImages) {
              if (img?.url) preloadImage(img.url);
              if (img?.thumbnailUrl) preloadImage(img.thumbnailUrl);
            }
          } catch {
            // Skip — will be fetched on demand
          }
        }

        // ─── 4. Sort by category for infinite swipe ──────────────
        allProducts.sort((a: any, b: any) => {
          const catA = a.category?.name || a.categoryId || "";
          const catB = b.category?.name || b.categoryId || "";
          if (catA !== catB) return catA.localeCompare(catB);
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setAllSlugs(allProducts.map((p) => p.slug));

        // ─── 5. Homepage sections ────────────────────────────────
        try {
          const sections: any = await api.get("/homepage");
          queryClient.setQueryData(["homepage-sections"], sections);
          // Preload homepage section images
          if (Array.isArray(sections)) {
            sections.forEach((s: any) => { if (s?.imageUrl) preloadImage(s.imageUrl); });
          }
        } catch { /* non-critical */ }

        // ─── 6. Also cache product lists per category ────────────
        if (Array.isArray(categories)) {
          for (const cat of categories) {
            const catProducts = allProducts.filter(
              (p: any) => p.category?.slug === cat.slug || p.categoryId === cat.id
            );
            // Pre-populate the infinite query cache for each category
            if (catProducts.length > 0) {
              queryClient.setQueryData(
                [...productKeys.lists(), "infinite", { category: cat.slug, sortBy: "createdAt", sortOrder: "desc", limit: 12 }],
                {
                  pages: [{
                    products: catProducts.slice(0, 12),
                    pagination: { page: 1, limit: 12, total: catProducts.length, totalPages: Math.ceil(catProducts.length / 12) },
                  }],
                  pageParams: [1],
                }
              );
            }
          }
        }
      } catch {
        // Silently fail — prefetch is best-effort
      }
    };

    // Start loading 500ms after first render
    const timer = setTimeout(loadEverything, 500);
    return () => clearTimeout(timer);
  }, [queryClient, setAllSlugs]);

  return <>{children}</>;
}
