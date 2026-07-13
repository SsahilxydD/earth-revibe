import { logger } from '../config/logger';

// Server→server ping to the storefront's /api/revalidate route so ISR pages
// tagged with these tags regenerate immediately after an admin edit. This
// backs up the admin browser's own ping, which depends on CORS + the admin
// deployment having NEXT_PUBLIC_REVALIDATION_SECRET set.
//
// Env (Railway):
//   STOREFRONT_REVALIDATION_SECRET — must equal the storefront's REVALIDATION_SECRET
//   STOREFRONT_URLS                — comma-separated, defaults to the prod domain
const STOREFRONT_URLS = (process.env.STOREFRONT_URLS || 'https://www.earthrevibe.com')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const SECRET = process.env.STOREFRONT_REVALIDATION_SECRET || '';

/** Fire-and-forget: never throws, never blocks the response. */
export function revalidateStorefrontTags(tags: string[]): void {
  if (!SECRET || tags.length === 0) {
    if (!SECRET) {
      logger.debug(
        { tags },
        'STOREFRONT_REVALIDATION_SECRET not set — skipping storefront revalidation ping'
      );
    }
    return;
  }

  const body = JSON.stringify({ secret: SECRET, tags });

  for (const url of STOREFRONT_URLS) {
    fetch(`${url}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
      .then(async (res) => {
        if (!res.ok) {
          logger.warn(
            { url, status: res.status, body: await res.text().catch(() => '') },
            'Storefront revalidation ping rejected'
          );
        }
      })
      .catch((err) => {
        logger.warn({ url, err: String(err) }, 'Storefront revalidation ping failed');
      });
  }
}
