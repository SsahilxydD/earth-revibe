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
    slug: 'goa-starter-pack',
    name: 'The Goa Starter Pack',
    kicker: '3 PIECES · BEACH',
    vibe: 'salt-on-skin',
    category: '3-piece',
    pieceCount: 3,
    featured: true,
    tagline: 'Sun. Sand. Sorted.',
    description:
      'A 3-day Goa trip with zero planning stress. One breezy polo for the beach shack, one camp shirt for the sunset cruise, one tee for the morning walk.',
  },
  {
    slug: 'manali-morning-kit',
    name: 'Manali Morning Kit',
    kicker: '3 PIECES · MOUNTAIN',
    vibe: 'above-the-clouds',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Layer up, chill out.',
    description:
      'Manali mornings are cold, afternoons are golden. A layerable shacket over a minimal tee, with cargo pants for the trek to Jogini Falls.',
  },
  {
    slug: 'udaipur-royal',
    name: 'Udaipur Royal',
    kicker: '3 PIECES · DESERT',
    vibe: 'golden-hour-gang',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Palace vibes, street prices.',
    description:
      'Walking through the City of Lakes needs outfits that feel regal but relaxed. Heritage plaid for the rooftop dinner, golden polo for the palace visit, cream trousers tying it all together.',
  },
  {
    slug: '5-day-drifter',
    name: 'The 5-Day Drifter',
    kicker: '5 PIECES · CITY',
    vibe: 'neon-nomads',
    category: '5-piece',
    pieceCount: 5,
    featured: true,
    tagline: 'One bag. Five days. Zero repeats.',
    description:
      'The ultimate capsule wardrobe for any 5-day trip across India. Mix-and-match perfection — 2 shirts, 2 tees, 1 pant. Every combo works.',
  },
  {
    slug: 'kashmir-wanderer',
    name: 'Kashmir Wanderer',
    kicker: '4 PIECES · MOUNTAIN',
    vibe: 'above-the-clouds',
    category: '3-piece',
    pieceCount: 4,
    tagline: 'From Dal Lake to Pahalgam.',
    description:
      'Kashmir demands layers and warmth without losing style. A shacket for the shikara ride, a plaid shirt for the bonfire, a cozy tee underneath, and cargos for every terrain.',
  },
  {
    slug: 'beach-bum-essentials',
    name: 'Beach Bum Essentials',
    kicker: '3 PIECES · BEACH',
    vibe: 'salt-on-skin',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Tan lines & good times.',
    description:
      "Whether it's Varkala, Gokarna, or Pondicherry — the only trio you need. A stripe shirt thrown open over a graphic tee, relaxed pants for the coastal walk.",
  },
  {
    slug: 'brunch-date',
    name: 'The Brunch Date',
    kicker: '2 PIECES · CITY',
    vibe: 'neon-nomads',
    category: 'weekender',
    pieceCount: 2,
    tagline: 'Effortlessly put together.',
    description:
      "That cafe in Jaipur, the rooftop in Bandra, the bistro in Pondicherry. Two pieces that make you look like you tried hard when you didn't.",
  },
  {
    slug: 'hostel-hopper',
    name: 'Hostel Hopper',
    kicker: '4 PIECES · CITY',
    vibe: 'neon-nomads',
    category: '3-piece',
    pieceCount: 4,
    tagline: 'Pack light. Live loud.',
    description:
      'Backpacking through India? Pieces that wash easy, dry fast, and look good in every hostel selfie. Four essentials, endless combinations.',
  },
  {
    slug: 'south-indian-soul',
    name: 'South Indian Soul',
    kicker: '3 PIECES · JUNGLE',
    vibe: 'into-the-wild',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Temple runs & filter coffee.',
    description:
      "From Hampi's ruins to Kerala's backwaters. A relaxed camp shirt in earthy tones, a herbal tee for the humidity, and easy-going trousers that breathe.",
  },
  {
    slug: 'sunset-chaser',
    name: 'Sunset Chaser',
    kicker: '2 PIECES · DESERT',
    vibe: 'golden-hour-gang',
    category: 'weekender',
    pieceCount: 2,
    tagline: 'Golden hour ready.',
    description:
      'That magic moment when the sky turns orange and you need to look effortlessly iconic. A sand-toned polo with art-printed pants — sunset-ready in seconds.',
  },
  {
    slug: 'road-trip-capsule',
    name: 'The Road Trip Capsule',
    kicker: '4 PIECES · CITY',
    vibe: 'neon-nomads',
    category: '3-piece',
    pieceCount: 4,
    tagline: 'Windows down. Music up.',
    description:
      'Delhi to Jaipur. Bangalore to Coorg. Mumbai to Lonavala. A 4-piece capsule that handles highway dhabas and hilltop viewpoints equally well.',
  },
  {
    slug: 'mountain-lodge',
    name: 'Mountain Lodge',
    kicker: '3 PIECES · MOUNTAIN',
    vibe: 'above-the-clouds',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Bonfire-approved fits.',
    description:
      "Sitting by a bonfire in Kasol, Tosh, or Bir with a warm overshirt, earthy tee, and sturdy cargos. That's this bundle.",
  },
  {
    slug: 'heritage-walk',
    name: 'Heritage Walk',
    kicker: '3 PIECES · DESERT',
    vibe: 'golden-hour-gang',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Old city. New style.',
    description:
      "Exploring Lucknow's Chowk, Ahmedabad's Pol, or Old Delhi's lanes. A check shirt, a clean minimal tee, and formal trousers that keep you cool in crowded gullies.",
  },
  {
    slug: 'polo-and-chill',
    name: 'Polo & Chill',
    kicker: '3 PIECES · BEACH',
    vibe: 'salt-on-skin',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Three polos. Three moods.',
    description:
      'The polo tripack for the guy who loves versatile basics. One for the pool, one for the town walk, one for the dinner. Three vibes, one vibe-check.',
  },
  {
    slug: 'jungle-book',
    name: 'The Jungle Book',
    kicker: '3 PIECES · JUNGLE',
    vibe: 'into-the-wild',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Safari-ready. City-approved.',
    description:
      'Heading to Jim Corbett, Ranthambore, or Kaziranga? Olive and earthy tones that blend with nature but still turn heads at the resort dinner.',
  },
  {
    slug: 'weekend-getaway',
    name: 'Weekend Getaway',
    kicker: '2 PIECES · MOUNTAIN',
    vibe: 'above-the-clouds',
    category: 'weekender',
    pieceCount: 2,
    tagline: '48 hours. 2 pieces. Done.',
    description:
      'A quick weekend escape — Lonavala, Mahabaleshwar, Coorg. One versatile shirt and one great pair of pants. Mix with what you already own.',
  },
  {
    slug: 'full-nomad',
    name: 'The Full Nomad',
    kicker: '5 PIECES · CITY',
    vibe: 'neon-nomads',
    category: '5-piece',
    pieceCount: 5,
    tagline: '15 days. One backpack. Legend status.',
    description:
      'The ultimate travel wardrobe for the extended trip. 2 tees, 1 shirt, 1 shacket, 1 pant — mix and match for 15+ unique looks. From hostels to homestays.',
  },
  {
    slug: 'coastal-drift',
    name: 'Coastal Drift',
    kicker: '3 PIECES · BEACH',
    vibe: 'salt-on-skin',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'Salt air & easy wear.',
    description:
      'For the ones who chase coastlines — from Goa to Gokarna to Kanyakumari. A marine-themed shirt, a wave-inspired tee, and bellbottoms that catch the sea breeze.',
  },
  {
    slug: 'night-market-navigator',
    name: 'Night Market Navigator',
    kicker: '3 PIECES · CITY',
    vibe: 'neon-nomads',
    category: '3-piece',
    pieceCount: 3,
    tagline: 'From bazaar to bar.',
    description:
      "Goa's Saturday Night Market, Jaipur's Johari Bazaar, Delhi's Hauz Khas. A statement polo, star-printed shirt on top, cool cargo pants underneath.",
  },
  {
    slug: 'farewell-flex',
    name: 'The Farewell Flex',
    kicker: '4 PIECES · CITY',
    vibe: 'neon-nomads',
    category: '3-piece',
    pieceCount: 4,
    tagline: 'Last night. Best night.',
    description:
      'The last night of every trip is the most memorable. Dress like it. A blooming oversized shirt, a graphic tee layered under, premium trousers, a shacket tied around the waist.',
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
