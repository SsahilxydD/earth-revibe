// Block types for the storefront homepage CMS (homepage_blocks table).
// HERO and FEATURED_PRODUCTS are singletons — one active block each,
// upserted by type. STORY_STACK and VIBE_CARD repeat, ordered by sortOrder.
export const HOMEPAGE_BLOCK_TYPES = [
  'HERO',
  'STORY_STACK',
  'VIBE_CARD',
  'FEATURED_PRODUCTS',
] as const;

export type HomepageBlockType = (typeof HOMEPAGE_BLOCK_TYPES)[number];

export function isHomepageBlockType(v: unknown): v is HomepageBlockType {
  return typeof v === 'string' && (HOMEPAGE_BLOCK_TYPES as readonly string[]).includes(v);
}
