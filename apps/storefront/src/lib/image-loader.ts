import type { ImageLoaderProps } from 'next/image';

/**
 * Custom Next.js image loader.
 *
 * - Cloudflare/Cloudinary: routes directly to their CDN transform APIs
 *   (bypasses Vercel proxy entirely — zero cache writes)
 * - Supabase Storage: routes through Vercel's /_next/image proxy because
 *   Supabase's image transform API requires a separate add-on.
 *   Vercel resizes + caches these, but only one fetch per size.
 * - Local images: uses Vercel's built-in optimization
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75;

  // Cloudflare Image Delivery — direct CDN, no Vercel proxy
  if (src.includes('imagedelivery.net')) {
    const base = src.replace(/\/[^/]*$/, '');
    return `${base}/w=${width},quality=${q},format=auto`;
  }

  // Legacy Cloudinary — direct CDN, no Vercel proxy
  if (src.includes('cloudinary.com')) {
    const cleaned = src.replace(/\/upload\/[^/]*\//, '/upload/');
    return cleaned.replace('/upload/', `/upload/w_${width},f_auto,q_${q}/`);
  }

  // Everything else (Supabase, local images) — use Vercel's image optimization
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}
