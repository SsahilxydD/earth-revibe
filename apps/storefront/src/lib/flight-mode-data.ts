/* ------------------------------------------------------------------ */
/*  Flight Mode — static combo/bundle data                              */
/*                                                                      */
/*  Frontend-only mock until bundles become first-class in the API.    */
/*  Each combo lists its pieces with real storefront product slugs so  */
/*  the detail page can link out to the full PDP if the customer wants */
/*  more info on any single piece.                                     */
/* ------------------------------------------------------------------ */

export interface ComboPiece {
  slug: string;
  kind: string; // e.g., 'BASE TEE', 'OVERSHIRT'
  name: string;
  image: string;
  price: number;
}

export interface Combo {
  slug: string;
  name: string;
  kicker: string;
  vibe: 'above-the-clouds' | 'salt-on-skin' | 'golden-hour-gang' | 'into-the-wild' | 'neon-nomads';
  category: '3-piece' | '5-piece' | 'weekender';
  featured?: boolean;
  tagline: string;
  description: string;
  pieces: ComboPiece[];
  individualTotal: number;
  price: number;
  heroImages: string[];
}

export const COMBOS: Combo[] = [
  {
    slug: 'touch-and-go',
    name: 'Touch-and-Go',
    kicker: '7-PIECE · WEEKENDER',
    vibe: 'salt-on-skin',
    category: 'weekender',
    featured: true,
    tagline: 'The full runway-to-resort kit.',
    description:
      '2 tees · 1 overshirt · 1 polo · 2 trousers · 1 bag. Built for five-day trips where the packing list writes itself.',
    pieces: [
      {
        slug: 'core-tee-fog',
        kind: 'BASE TEE',
        name: 'Core Tee — Fog',
        image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80',
        price: 990,
      },
      {
        slug: 'core-tee-salt',
        kind: 'BASE TEE',
        name: 'Core Tee — Salt',
        image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80',
        price: 990,
      },
      {
        slug: 'cloud-overshirt',
        kind: 'OVERSHIRT',
        name: 'Cloud Overshirt — Stone',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
        price: 1290,
      },
      {
        slug: 'weekend-polo',
        kind: 'POLO',
        name: 'Weekend Polo — Sand',
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
        price: 1190,
      },
      {
        slug: 'trail-trouser-olive',
        kind: 'TROUSER',
        name: 'Trail Trouser — Olive',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
        price: 1290,
      },
      {
        slug: 'trail-trouser-sand',
        kind: 'TROUSER',
        name: 'Trail Trouser — Sand',
        image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
        price: 1290,
      },
      {
        slug: 'weekender-bag',
        kind: 'BAG',
        name: 'Weekender — Charcoal',
        image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
        price: 890,
      },
    ],
    individualTotal: 6930,
    price: 5380,
    heroImages: ['https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=720&q=80'],
  },
  {
    slug: 'salt-pack',
    name: 'The Salt Pack',
    kicker: '3-PIECE · BEACH COLLECTION',
    vibe: 'salt-on-skin',
    category: '3-piece',
    tagline: 'Linen shirt + shorts + tee.',
    description: 'Everything for a 3-day getaway where the agenda is nothing.',
    pieces: [
      {
        slug: 'relaxed-linen-sand',
        kind: 'LINEN SHIRT',
        name: 'Relaxed Linen — Sand',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
        price: 990,
      },
      {
        slug: 'weekend-shorts-ivory',
        kind: 'EASY SHORTS',
        name: 'Weekend Shorts — Ivory',
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
        price: 990,
      },
      {
        slug: 'core-tee-salt',
        kind: 'BASE TEE',
        name: 'Core Tee — Salt',
        image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80',
        price: 990,
      },
    ],
    individualTotal: 2970,
    price: 2370,
    heroImages: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80',
    ],
  },
  {
    slug: 'above-the-fold',
    name: 'Above the Fold',
    kicker: '5-PIECE · MOUNTAIN COLLECTION',
    vibe: 'above-the-clouds',
    category: '5-piece',
    tagline: 'Layering set for thin air.',
    description: 'Tee, overshirt, hoodie, trouser, scarf — built for altitude.',
    pieces: [
      {
        slug: 'core-tee-fog',
        kind: 'BASE TEE',
        name: 'Core Tee — Fog',
        image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80',
        price: 990,
      },
      {
        slug: 'cloud-overshirt',
        kind: 'OVERSHIRT',
        name: 'Cloud Overshirt — Stone',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
        price: 1290,
      },
      {
        slug: 'summit-hoodie',
        kind: 'HOODIE',
        name: 'Summit Hoodie — Ash',
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
        price: 1490,
      },
      {
        slug: 'trail-trouser-olive',
        kind: 'TROUSER',
        name: 'Trail Trouser — Olive',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
        price: 1290,
      },
      {
        slug: 'wool-scarf-charcoal',
        kind: 'SCARF',
        name: 'Wool Scarf — Charcoal',
        image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80',
        price: 890,
      },
    ],
    individualTotal: 5950,
    price: 3850,
    heroImages: ['https://images.unsplash.com/photo-1519681393784-d120267933ba?w=720&q=80'],
  },
  {
    slug: 'neon-starter',
    name: 'Neon Starter',
    kicker: '3-PIECE · CITY & NIGHTLIFE',
    vibe: 'neon-nomads',
    category: '3-piece',
    tagline: 'Street-ready trio for late nights.',
    description: 'Tee + overshirt + trouser. Fast kit for city trips.',
    pieces: [
      {
        slug: 'core-tee-midnight',
        kind: 'BASE TEE',
        name: 'Core Tee — Midnight',
        image: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=600&q=80',
        price: 990,
      },
      {
        slug: 'neon-overshirt',
        kind: 'OVERSHIRT',
        name: 'Neon Overshirt — Electric',
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
        price: 990,
      },
      {
        slug: 'city-trouser-jet',
        kind: 'TROUSER',
        name: 'City Trouser — Jet',
        image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
        price: 990,
      },
    ],
    individualTotal: 2970,
    price: 2370,
    heroImages: [
      'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=600&q=80',
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=600&q=80',
    ],
  },
];

export const VIBE_META: Record<
  Combo['vibe'],
  { label: [string, string]; kicker: string; bg: string }
> = {
  'above-the-clouds': {
    label: ['Above the', 'Clouds'],
    kicker: 'MOUNTAIN',
    bg: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
  },
  'salt-on-skin': {
    label: ['Salt on', 'Skin'],
    kicker: 'BEACH',
    bg: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  },
  'golden-hour-gang': {
    label: ['Golden', 'Hour Gang'],
    kicker: 'DESERT',
    bg: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80',
  },
  'into-the-wild': {
    label: ['Into the', 'Wild'],
    kicker: 'JUNGLE',
    bg: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
  },
  'neon-nomads': {
    label: ['Neon', 'Nomads'],
    kicker: 'CITY',
    bg: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=400&q=80',
  },
};

export function getCombo(slug: string): Combo | undefined {
  return COMBOS.find((c) => c.slug === slug);
}

export function formatBundleSavings(c: Combo): {
  savedAmount: number;
  savedPct: number;
} {
  const savedAmount = c.individualTotal - c.price;
  const savedPct = Math.round((savedAmount / c.individualTotal) * 100);
  return { savedAmount, savedPct };
}
