/**
 * Maps each trip-vibe slug to the category slugs that should be returned
 * when the user selects that vibe on /products.
 *
 * The mapping is intentionally a flat config so product/marketing can
 * revise it without touching the page or filter wiring. Storefront-only.
 *
 * STRAWMAN: refine slug lists as the catalog evolves.
 */
export const VIBE_TO_CATEGORIES: Record<string, readonly string[]> = {
  'above-the-clouds': ['outerwear'],
  'salt-on-skin': ['t-shirts', 'shirts'],
  'golden-hour-gang': ['shirts', 't-shirts'],
  'into-the-wild': ['cargo-pants', 'outerwear'],
  'neon-nomads': ['polos', 'trousers'],
  'flight-mode': ['shirts', 't-shirts', 'polos', 'cargo-pants', 'trousers', 'outerwear'],
};

export const VIBE_SLUGS = Object.keys(VIBE_TO_CATEGORIES);

export function isKnownVibe(slug: string | null | undefined): slug is string {
  return !!slug && slug in VIBE_TO_CATEGORIES;
}

export function categoriesForVibe(slug: string | null | undefined): string[] | undefined {
  if (!isKnownVibe(slug)) return undefined;
  return [...VIBE_TO_CATEGORIES[slug]];
}
