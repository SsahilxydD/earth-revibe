'use client';

import { create } from 'zustand';

interface ProductNavState {
  /** All product slugs sorted by category — the global swipe list */
  allSlugs: string[];
  /** Slugs from current category page (subset, for category-specific nav) */
  slugs: string[];
  sourceLabel: string | null;
  sourceUrl: string | null;

  /** Set the global product list (called by PrefetchProvider) */
  setAllSlugs: (slugs: string[]) => void;
  /** Set category-specific nav context (called by category pages) */
  setNavContext: (slugs: string[], sourceLabel: string | null, sourceUrl: string | null) => void;
  clearNavContext: () => void;
  /** Get adjacent slugs — LOOPS infinitely. Uses category slugs if set, else global list */
  getAdjacentSlugs: (slug: string) => { prev: string | null; next: string | null };
}

export const useProductNavStore = create<ProductNavState>()((set, get) => ({
  allSlugs: [],
  slugs: [],
  sourceLabel: null,
  sourceUrl: null,

  setAllSlugs: (allSlugs) => set({ allSlugs }),

  setNavContext: (slugs, sourceLabel, sourceUrl) => set({ slugs, sourceLabel, sourceUrl }),

  clearNavContext: () => set({ slugs: [], sourceLabel: null, sourceUrl: null }),

  getAdjacentSlugs: (slug) => {
    const { slugs, allSlugs } = get();
    // Use category-specific list if available, else global list
    const list = slugs.length > 1 ? slugs : allSlugs;
    if (list.length < 2) return { prev: null, next: null };

    const idx = list.indexOf(slug);
    if (idx === -1) {
      // Product not in list — find closest match or use first/last
      return { prev: list[list.length - 1], next: list[0] };
    }

    // INFINITE LOOP — last wraps to first, first wraps to last
    return {
      prev: list[(idx - 1 + list.length) % list.length],
      next: list[(idx + 1) % list.length],
    };
  },
}));
