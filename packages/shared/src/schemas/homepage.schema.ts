import { z } from 'zod';
import { VIBES } from '../enums/vibe';

// Image URLs may be absolute (Cloudflare Images / imagedelivery.net) or
// storefront-relative ("/covers/linens.jpg"), so no .url() here. Hrefs are
// storefront-relative by convention ("/products?vibe=...").
const imageUrl = z.string().min(1).max(500);
const storefrontHref = z.string().min(1).max(300);

// ---------------------------------------------------------------------------
// Per-block content payloads (HomepageBlock.content, keyed by HomepageBlock.type)
// ---------------------------------------------------------------------------

export const homepageHeroContentSchema = z.object({
  imageUrl,
  kicker: z.string().max(80).default(''),
  headline: z.string().min(1).max(120),
  headlineItalic: z.string().max(120).default(''),
  ctaLabel: z.string().max(40).default(''),
  ctaHref: storefrontHref.default('/products'),
});

export const homepageStoryItemSchema = z.object({
  imageUrl,
  kicker: z.string().max(60).default(''),
  headline: z.string().max(120).default(''),
  ctaLabel: z.string().max(40).default(''),
  ctaHref: z.string().max(300).default(''),
  /** Playback length in ms; storefront falls back to its default when unset. */
  durationMs: z.number().int().min(3000).max(60000).optional(),
});

export const homepageStoryStackContentSchema = z.object({
  name: z.string().min(1).max(30),
  avatarUrl: imageUrl,
  /** CSS object-position for the circle crop, e.g. "50% 20%". */
  avatarPosition: z.string().max(30).default('50% 50%'),
  items: z.array(homepageStoryItemSchema).min(1).max(10),
});

export const homepageVibeCardContentSchema = z.object({
  label: z.string().min(1).max(30),
  vibe: z.enum(VIBES),
  imageUrl,
});

export const homepageFeaturedContentSchema = z.object({
  /** Curated product ids in display order. Empty = fall back to isFeatured flag. */
  productIds: z.array(z.string().min(1)).max(12).default([]),
});

// ---------------------------------------------------------------------------
// Admin request schemas
// ---------------------------------------------------------------------------

export const createHomepageBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('HERO'), content: homepageHeroContentSchema }),
  z.object({ type: z.literal('STORY_STACK'), content: homepageStoryStackContentSchema }),
  z.object({ type: z.literal('VIBE_CARD'), content: homepageVibeCardContentSchema }),
  z.object({ type: z.literal('FEATURED_PRODUCTS'), content: homepageFeaturedContentSchema }),
]);

// `content` is only shallow-checked here — the service deep-validates it
// against the stored block's type (the type isn't known at middleware time).
export const updateHomepageBlockSchema = z.object({
  content: z.unknown().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const reorderHomepageBlocksSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

// ---------------------------------------------------------------------------
// Public composed payload (GET /api/v1/homepage) — the storefront parses the
// response with homepagePayloadSchema so a drifted API can never render junk.
// ---------------------------------------------------------------------------

export const homepageFeaturedProductSchema = z.object({
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  image: z.string().nullable(),
  rating: z.number().nullable(),
  reviews: z.number().nullable(),
});

export const homepagePayloadSchema = z.object({
  hero: homepageHeroContentSchema.nullable(),
  storyStacks: z.array(homepageStoryStackContentSchema.extend({ id: z.string() })),
  vibeCards: z.array(
    homepageVibeCardContentSchema.extend({
      id: z.string(),
      pieceCount: z.number().nullable(),
    })
  ),
  featured: z.array(homepageFeaturedProductSchema),
});

export type HomepageHeroContent = z.infer<typeof homepageHeroContentSchema>;
export type HomepageStoryItem = z.infer<typeof homepageStoryItemSchema>;
export type HomepageStoryStackContent = z.infer<typeof homepageStoryStackContentSchema>;
export type HomepageVibeCardContent = z.infer<typeof homepageVibeCardContentSchema>;
export type HomepageFeaturedContent = z.infer<typeof homepageFeaturedContentSchema>;
export type HomepageFeaturedProduct = z.infer<typeof homepageFeaturedProductSchema>;
export type HomepagePayload = z.infer<typeof homepagePayloadSchema>;
export type CreateHomepageBlockInput = z.infer<typeof createHomepageBlockSchema>;
export type UpdateHomepageBlockInput = z.infer<typeof updateHomepageBlockSchema>;

/** Raw block row as returned by the admin blocks API. */
export interface HomepageBlockRecord {
  id: string;
  type: 'HERO' | 'STORY_STACK' | 'VIBE_CARD' | 'FEATURED_PRODUCTS';
  content: unknown;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
