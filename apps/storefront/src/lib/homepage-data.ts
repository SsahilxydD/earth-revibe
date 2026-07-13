import {
  homepagePayloadSchema,
  type HomepageFeaturedProduct,
  type HomepagePayload,
} from '@earth-revibe/shared';

// Server-side data layer for the homepage. Every fetch is ISR-cached for an
// hour AND tagged 'homepage' — the admin app pings /api/revalidate with that
// tag after every homepage edit (see admin's revalidate-storefront.ts), so
// CMS changes go live immediately without waiting out the hour.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

const CACHE: RequestInit & { next: { revalidate: number; tags: string[] } } = {
  next: { revalidate: 3600, tags: ['homepage'] },
};

/**
 * Composed CMS payload, or null when the endpoint is unreachable or returns
 * a shape that fails schema validation. Callers treat null as "render the
 * built-in defaults" — the homepage must survive an API outage.
 */
export async function fetchHomepage(): Promise<HomepagePayload | null> {
  try {
    const res = await fetch(`${API_BASE}/homepage`, CACHE);
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = homepagePayloadSchema.safeParse(json?.data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Direct isFeatured query — only used when fetchHomepage() itself fails,
 * so a broken /homepage endpoint can't empty the featured rail while the
 * products API is still healthy.
 */
export async function fetchFeaturedFallback(): Promise<HomepageFeaturedProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/products?isFeatured=true&limit=4`, CACHE);
    if (!res.ok) return [];
    const json = await res.json();
    const products = json?.data?.products;
    if (!Array.isArray(products)) return [];
    return products.map(
      (p: {
        slug: string;
        name: string;
        price: string;
        category?: { name?: string };
        images?: { url: string; isPrimary?: boolean }[];
        averageRating?: number;
        reviewCount?: number;
      }) => ({
        slug: p.slug,
        name: p.name,
        price: Number(p.price),
        category: p.category?.name?.toUpperCase() ?? 'PIECE',
        image: p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? null,
        rating: typeof p.averageRating === 'number' ? p.averageRating : null,
        reviews: typeof p.reviewCount === 'number' ? p.reviewCount : null,
      })
    );
  } catch {
    return [];
  }
}

/** Piece count for one vibe — used for the default (non-CMS) vibe cards. */
export async function fetchVibeCount(vibe: string): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/products?vibe=${vibe}&limit=1`, CACHE);
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.data?.total === 'number' ? json.data.total : null;
  } catch {
    return null;
  }
}
