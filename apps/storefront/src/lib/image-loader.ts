import type { ImageLoaderProps } from 'next/image';

/**
 * Custom Next.js image loader.
 *
 * Routes images directly to their origin CDN instead of through Vercel's
 * /_next/image proxy. This prevents Vercel from re-fetching originals from
 * Supabase Storage on every cache miss, which was draining Supabase bandwidth.
 *
 * - Supabase URLs → Supabase's built-in image transform API
 * - Cloudflare URLs → Cloudflare's /w=N,format=auto variant suffix
 * - Cloudinary URLs → Cloudinary's w_N,f_auto transform
 * - Everything else → returned as-is
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75;

  // Supabase Storage → use Supabase's render/transform API
  if (src.includes('.supabase.co/storage/v1/object/public/')) {
    const renderUrl = src.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const url = new URL(renderUrl);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', q.toString());
    return url.toString();
  }

  // Cloudflare Image Delivery → variant suffix
  if (src.includes('imagedelivery.net')) {
    return src.replace(/\/public$/, `/w=${width},quality=${q},format=auto`);
  }

  // Legacy Cloudinary
  if (src.includes('cloudinary.com')) {
    return src.replace('/upload/', `/upload/w_${width},f_auto,q_${q}/`);
  }

  // Fallback: return as-is (data URIs, local images, etc.)
  return src;
}
