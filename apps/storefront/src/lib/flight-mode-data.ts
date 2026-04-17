/* ------------------------------------------------------------------ */
/*  Flight Mode — combo metadata only                                   */
/*                                                                      */
/*  Combos are composed at render time from real products pulled via   */
/*  useProducts({ vibe }). This file carries the editorial shell only: */
/*  slug, name, pitch copy, which vibe filter to use, how many pieces  */
/*  to pull, and the bundle discount. Everything else — images,         */
/*  names, prices, stock, variants — comes from the API.                */
/* ------------------------------------------------------------------ */

import type { Product } from '@/types';

export type ComboVibe =
  | 'above-the-clouds'
  | 'salt-on-skin'
  | 'golden-hour-gang'
  | 'into-the-wild'
  | 'neon-nomads';

export type ComboCategory = '3-piece' | '5-piece' | 'weekender';

export interface ComboMeta {
  slug: string;
  name: string;
  kicker: string;
  vibe: ComboVibe;
  category: ComboCategory;
  pieceCount: number;
  discountPct: number;
  featured?: boolean;
  tagline: string;
  description: string;
}

/**
 * The editorial roster of combos. Each entry references a vibe — the combo
 * is then rendered from whatever products currently carry that vibe tag.
 * Add/remove combos here without touching component code.
 */
export const COMBOS: ComboMeta[] = [
  {
    slug: 'touch-and-go',
    name: 'Touch-and-Go',
    kicker: '7-PIECE · WEEKENDER',
    vibe: 'salt-on-skin',
    category: 'weekender',
    pieceCount: 7,
    discountPct: 22,
    featured: true,
    tagline: 'The full runway-to-resort kit.',
    description:
      'Everything you need for five days of nothing on the schedule. One kit, one checkout.',
  },
  {
    slug: 'salt-pack',
    name: 'The Salt Pack',
    kicker: '3-PIECE · BEACH',
    vibe: 'salt-on-skin',
    category: '3-piece',
    pieceCount: 3,
    discountPct: 20,
    tagline: 'Sun, sand, no layers.',
    description: 'Three pieces for a 3-day getaway where the agenda is nothing.',
  },
  {
    slug: 'above-the-fold',
    name: 'Above the Fold',
    kicker: '5-PIECE · MOUNTAIN',
    vibe: 'above-the-clouds',
    category: '5-piece',
    pieceCount: 5,
    discountPct: 22,
    tagline: 'Layering set for thin air.',
    description: 'Five pieces that stack for cold mornings and sun-warm afternoons.',
  },
  {
    slug: 'neon-starter',
    name: 'Neon Starter',
    kicker: '3-PIECE · CITY',
    vibe: 'neon-nomads',
    category: '3-piece',
    pieceCount: 3,
    discountPct: 20,
    tagline: 'Street-ready trio for late nights.',
    description: 'Three pieces that carry a city trip from coffee to 2am.',
  },
];

export const VIBE_META: Record<ComboVibe, { label: [string, string]; kicker: string }> = {
  'above-the-clouds': { label: ['Above the', 'Clouds'], kicker: 'MOUNTAIN' },
  'salt-on-skin': { label: ['Salt on', 'Skin'], kicker: 'BEACH' },
  'golden-hour-gang': { label: ['Golden', 'Hour Gang'], kicker: 'DESERT' },
  'into-the-wild': { label: ['Into the', 'Wild'], kicker: 'JUNGLE' },
  'neon-nomads': { label: ['Neon', 'Nomads'], kicker: 'CITY' },
};

export function getCombo(slug: string): ComboMeta | undefined {
  return COMBOS.find((c) => c.slug === slug);
}

/** Sum the real prices of the first N products for a combo. */
export function comboIndividualTotal(products: Product[], pieceCount: number): number {
  return products.slice(0, pieceCount).reduce((acc, p) => acc + p.price, 0);
}

/** Apply the combo's discount to the summed individual prices. */
export function comboPrice(individualTotal: number, discountPct: number): number {
  return Math.round(individualTotal * (1 - discountPct / 100));
}

/** Get the primary (or first) image URL for a product, or null if none. */
export function primaryImageUrl(product: Product | undefined | null): string | null {
  if (!product) return null;
  const sorted = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((i) => i.isPrimary) || sorted[0];
  return primary?.url || null;
}
