const STOREFRONT_URLS = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.earthrevibe.com')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const REVALIDATION_SECRET = process.env.NEXT_PUBLIC_REVALIDATION_SECRET || '';

/**
 * Fire-and-forget: tell all storefront domains to revalidate cached data by tag.
 * Supports comma-separated URLs in NEXT_PUBLIC_STOREFRONT_URL.
 * Runs in the background — never blocks UI or throws to the caller.
 */
export function revalidateStorefront(tags: string[]) {
  if (!REVALIDATION_SECRET || tags.length === 0) return;

  const body = JSON.stringify({ secret: REVALIDATION_SECRET, tags });

  for (const url of STOREFRONT_URLS) {
    fetch(`${url}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {
      // Silently ignore — storefront cache will expire naturally via revalidate timer
    });
  }
}
