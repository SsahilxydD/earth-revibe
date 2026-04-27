/* ------------------------------------------------------------------ */
/*  Flight Mode — storefront-side helpers                               */
/*                                                                      */
/*  Combo definitions + discount math now live in @earth-revibe/shared  */
/*  so the storefront and the API agree on what a combo is and how it   */
/*  prices. This module re-exports them for storefront imports and      */
/*  carries the storefront-only Product helpers used by the cards.      */
/* ------------------------------------------------------------------ */

import type { Product } from '@/types';

export {
  type ComboVibe,
  type ComboCategory,
  type ComboMeta,
  type ComboKind,
  COMBOS,
  getCombo,
  byoSlugFor,
  discountPctFor,
  comboDiscountPct,
} from '@earth-revibe/shared';

export const VIBE_META: Record<
  'above-the-clouds' | 'salt-on-skin' | 'golden-hour-gang' | 'into-the-wild' | 'neon-nomads',
  { label: [string, string]; kicker: string }
> = {
  'above-the-clouds': { label: ['Above the', 'Clouds'], kicker: 'MOUNTAIN' },
  'salt-on-skin': { label: ['Salt on', 'Skin'], kicker: 'BEACH' },
  'golden-hour-gang': { label: ['Golden', 'Hour Gang'], kicker: 'DESERT' },
  'into-the-wild': { label: ['Into the', 'Wild'], kicker: 'JUNGLE' },
  'neon-nomads': { label: ['Neon', 'Nomads'], kicker: 'CITY' },
};

/**
 * Coerce a numeric-looking value to a real number. The API serializes
 * Postgres `numeric` columns as strings (e.g. "990.00"), so arithmetic
 * on product.price without this accidentally does string concatenation.
 */
export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Sum the real prices of the first N products for a combo. */
export function comboIndividualTotal(products: Product[], pieceCount: number): number {
  return products.slice(0, pieceCount).reduce((acc, p) => acc + toNumber(p.price), 0);
}

/** Apply a discount % to the summed individual prices. */
export function comboPrice(individualTotal: number, discountPct: number): number {
  return Math.round(toNumber(individualTotal) * (1 - discountPct / 100));
}

/** Get the primary (or first) image URL for a product, or null if none. */
export function primaryImageUrl(product: Product | undefined | null): string | null {
  if (!product) return null;
  const sorted = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = sorted.find((i) => i.isPrimary) || sorted[0];
  return primary?.url || null;
}
