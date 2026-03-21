"use client";

import { create } from "zustand";

interface ProductNavState {
  slugs: string[];
  sourceLabel: string | null;
  sourceUrl: string | null;

  setNavContext: (slugs: string[], sourceLabel: string | null, sourceUrl: string | null) => void;
  clearNavContext: () => void;
  getAdjacentSlugs: (slug: string) => { prev: string | null; next: string | null };
}

export const useProductNavStore = create<ProductNavState>()((set, get) => ({
  slugs: [],
  sourceLabel: null,
  sourceUrl: null,

  setNavContext: (slugs, sourceLabel, sourceUrl) =>
    set({ slugs, sourceLabel, sourceUrl }),

  clearNavContext: () =>
    set({ slugs: [], sourceLabel: null, sourceUrl: null }),

  getAdjacentSlugs: (slug) => {
    const { slugs } = get();
    const idx = slugs.indexOf(slug);
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? slugs[idx - 1] : null,
      next: idx < slugs.length - 1 ? slugs[idx + 1] : null,
    };
  },
}));
