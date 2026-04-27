/* ------------------------------------------------------------------ */
/*  Flight Mode combos — single source of truth                         */
/*                                                                      */
/*  Both the storefront (preview math) and the API (authoritative       */
/*  discount on order creation) import combo definitions from here.     */
/*                                                                      */
/*  Discount mechanic:                                                  */
/*    - Combos identify themselves at the cart line via comboSlug       */
/*      (the curated combo's slug, or a synthetic 'byo-{N}' for         */
/*      Build-Your-Own kits) and a comboGroupId (uuid minted per        */
/*      "Add Pack" press, so two of the same combo price independently).*/
/*    - The ladder function below maps pieceCount → discount %.         */
/*    - Items WITHOUT comboSlug get 0% — no more leak to à la carte.    */
/* ------------------------------------------------------------------ */

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
  featured?: boolean;
  tagline: string;
  description: string;
}

export const COMBOS: ComboMeta[] = [
  {
    slug: 'touch-and-go',
    name: 'Touch-and-Go',
    kicker: '7 PIECES · WEEKENDER',
    vibe: 'salt-on-skin',
    category: 'weekender',
    pieceCount: 7,
    featured: true,
    tagline: 'The full runway-to-resort kit.',
    description: 'Five days of nothing on the schedule. One kit, one checkout.',
  },
  {
    slug: 'salt-pack',
    name: 'The Salt Pack',
    kicker: '3 PIECES · BEACH',
    vibe: 'salt-on-skin',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Sun, sand, no layers.',
    description:
      'Sun, sand, no layers. Three pieces for a 3-day getaway with nothing on the agenda.',
  },
  {
    slug: 'above-the-fold',
    name: 'Above the Fold',
    kicker: '5 PIECES · MOUNTAIN',
    vibe: 'above-the-clouds',
    category: '5-piece',
    pieceCount: 5,
    tagline: 'Layering set for thin air.',
    description:
      'Layering set for thin air. Five pieces that stack for cold mornings and sun-warm afternoons.',
  },
  {
    slug: 'neon-starter',
    name: 'Neon Starter',
    kicker: '3 PIECES · CITY',
    vibe: 'neon-nomads',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Street-ready trio for late nights.',
    description:
      'Street-ready trio for late nights. Three pieces that carry a city trip from coffee to 2am.',
  },
];

export function getCombo(slug: string): ComboMeta | undefined {
  return COMBOS.find((c) => c.slug === slug);
}

const BYO_SLUG_PREFIX = 'byo-';

/** Build a synthetic slug for Build-Your-Own kits, e.g. byo-5 for a 5-piece BYO. */
export function byoSlugFor(pieceCount: number): string {
  return `${BYO_SLUG_PREFIX}${pieceCount}`;
}

export type ComboKind = 'curated' | 'byo';

/**
 * The discount ladder. Curated kits beat BYO at every tier — curated
 * always wins by 3pp because the editorial pick adds non-monetary value
 * (curation + named identity) and BYO rewards customization at a small
 * tax. Wider gaps between tiers give the cart UI a visible "next-tier"
 * pull (e.g. cart drawer prompts "add 1 more piece, jump from 25% → 30%").
 *
 *   Curated: 3 → 20%, 5 → 25%, 7 → 30%
 *   BYO    : 3 → 17%, 5 → 22%, 7 → 27%
 */
export function discountPctFor(pieceCount: number, kind: ComboKind): number {
  if (kind === 'curated') {
    if (pieceCount >= 7) return 30;
    if (pieceCount >= 5) return 25;
    if (pieceCount >= 3) return 20;
    return 0;
  }
  // BYO
  if (pieceCount >= 7) return 27;
  if (pieceCount >= 5) return 22;
  if (pieceCount >= 3) return 17;
  return 0;
}

/** UI helper — what % to show on a curated combo card. */
export function comboDiscountPct(combo: Pick<ComboMeta, 'pieceCount'>): number {
  return discountPctFor(combo.pieceCount, 'curated');
}

export interface ComboDiscountInput {
  price: number;
  quantity: number;
  comboSlug?: string | null;
  comboGroupId?: string | null;
}

export interface ComboDiscountGroup {
  comboSlug: string;
  comboGroupId: string;
  pieceCount: number;
  groupSubtotal: number;
  discountPct: number;
  discountAmount: number;
}

export interface ComboDiscountResult {
  total: number;
  groups: ComboDiscountGroup[];
}

/**
 * Compute the combo discount for a cart of mixed items. Items without a
 * comboSlug+comboGroupId pair are à la carte and contribute nothing.
 *
 * For each (slug, groupId) group:
 *   - Curated combos: pieceCount must equal the combo's declared pieceCount
 *     (otherwise the kit is broken — e.g. user removed a piece — and the
 *     group falls back to 0%). The remaining items still sit in the cart
 *     at full price.
 *   - BYO kits (slug starts with 'byo-'): any pieceCount ≥ 3 qualifies; we
 *     trust the storefront because BYO has no canonical pieceCount.
 */
export function comboDiscount(items: ComboDiscountInput[]): ComboDiscountResult {
  const groupsMap = new Map<
    string,
    { comboSlug: string; comboGroupId: string; pieceCount: number; subtotal: number }
  >();

  for (const item of items) {
    if (!item.comboSlug || !item.comboGroupId) continue;
    const key = `${item.comboSlug}::${item.comboGroupId}`;
    const existing = groupsMap.get(key);
    const lineTotal = item.price * item.quantity;
    if (existing) {
      existing.pieceCount += item.quantity;
      existing.subtotal += lineTotal;
    } else {
      groupsMap.set(key, {
        comboSlug: item.comboSlug,
        comboGroupId: item.comboGroupId,
        pieceCount: item.quantity,
        subtotal: lineTotal,
      });
    }
  }

  const groups: ComboDiscountGroup[] = [];
  let total = 0;

  for (const g of groupsMap.values()) {
    const isByo = g.comboSlug.startsWith(BYO_SLUG_PREFIX);
    let qualifies = false;
    if (isByo) {
      qualifies = g.pieceCount >= 3;
    } else {
      const combo = getCombo(g.comboSlug);
      qualifies = !!combo && combo.pieceCount === g.pieceCount;
    }
    if (!qualifies) continue;

    const pct = discountPctFor(g.pieceCount, isByo ? 'byo' : 'curated');
    if (pct <= 0) continue;

    const amount = g.subtotal * (pct / 100);
    groups.push({
      comboSlug: g.comboSlug,
      comboGroupId: g.comboGroupId,
      pieceCount: g.pieceCount,
      groupSubtotal: g.subtotal,
      discountPct: pct,
      discountAmount: amount,
    });
    total += amount;
  }

  return { total: Math.round(total * 100) / 100, groups };
}
