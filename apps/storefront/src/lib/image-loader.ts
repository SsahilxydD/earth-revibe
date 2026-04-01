import type { ImageLoaderProps } from 'next/image';

/**
 * Custom Next.js image loader.
 *
 * - Cloudflare: direct CDN transform (no Vercel proxy)
 * - Cloudinary: direct CDN transform (no Vercel proxy)
 * - Supabase: returns raw URL as-is (images are too large for transform APIs)
 * - Local: returns raw URL for Next.js static serving
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

  // Supabase Storage & local images — return as-is
  // (Supabase transform API rejects files >25MB, Vercel proxy also fails on large PNGs)
  return src;
}
