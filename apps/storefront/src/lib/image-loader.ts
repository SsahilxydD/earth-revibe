import type { ImageLoaderProps } from 'next/image';

/**
 * Custom Next.js image loader.
 *
 * Routes images directly to their origin CDN instead of through Vercel's
 * /_next/image proxy. This prevents Vercel from re-fetching originals from
 * Supabase Storage on every cache miss, which was draining Supabase bandwidth.
 *
 * Handles both raw and pre-transformed URLs (from getImageUrl), replacing
 * any existing width/quality params with the values Next.js requests.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75;

  // Supabase Storage render/transform URL (already transformed by getImageUrl)
  if (src.includes('.supabase.co/storage/v1/render/image/public/')) {
    const url = new URL(src);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', q.toString());
    return url.toString();
  }

  // Supabase Storage raw URL → convert to render/transform API
  if (src.includes('.supabase.co/storage/v1/object/public/')) {
    const renderUrl = src.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const url = new URL(renderUrl);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', q.toString());
    return url.toString();
  }

  // Cloudflare Image Delivery — replace any existing variant suffix
  if (src.includes('imagedelivery.net')) {
    // Strip existing variant (e.g., /w=600,format=auto or /public) and apply new one
    const base = src.replace(/\/[^/]*$/, '');
    return `${base}/w=${width},quality=${q},format=auto`;
  }

  // Legacy Cloudinary — replace or insert transforms
  if (src.includes('cloudinary.com')) {
    // Remove existing transforms if present, then add new ones
    const cleaned = src.replace(/\/upload\/[^/]*\//, '/upload/');
    return cleaned.replace('/upload/', `/upload/w_${width},f_auto,q_${q}/`);
  }

  // Local images (e.g., /poster1.png) — return as-is, Next.js handles these
  return src;
}
