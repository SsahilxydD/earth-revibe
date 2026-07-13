// CMS image URLs may be storefront-relative (the built-in defaults, e.g.
// "/vibes/beach.webp"). The admin runs on a different origin, so previews
// must resolve them against the storefront's domain.
const STOREFRONT_ORIGIN = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://www.earthrevibe.com')
  .split(',')[0]
  .trim()
  .replace(/\/$/, '');

export function resolvePreviewUrl(url: string): string {
  return url.startsWith('/') ? `${STOREFRONT_ORIGIN}${url}` : url;
}
