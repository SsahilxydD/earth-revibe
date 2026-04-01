import type { ImageLoaderProps } from 'next/image';

/**
 * Custom Next.js image loader.
 *
 * - Cloudflare: direct CDN transform (no Vercel proxy)
 * - Cloudinary: direct CDN transform (no Vercel proxy)
 * - Supabase .webp: uses Supabase transform API (compressed uploads <1MB)
 * - Supabase .png: returns raw URL (legacy oversized files >25MB)
 * - Local: returns as-is
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75;

  // Cloudflare Image Delivery — direct CDN
  if (src.includes('imagedelivery.net')) {
    const base = src.replace(/\/[^/]*$/, '');
    return `${base}/w=${width},quality=${q},format=auto`;
  }

  // Legacy Cloudinary — direct CDN
  if (src.includes('cloudinary.com')) {
    const cleaned = src.replace(/\/upload\/[^/]*\//, '/upload/');
    return cleaned.replace('/upload/', `/upload/w_${width},f_auto,q_${q}/`);
  }

  // Supabase Storage — use transform API for compressed images (.webp),
  // raw URL for legacy oversized PNGs
  if (src.includes('.supabase.co/storage/v1/object/public/')) {
    const isCompressed = src.endsWith('.webp') || src.endsWith('.jpg') || src.endsWith('.jpeg');
    if (isCompressed) {
      const renderUrl = src.replace(
        '/storage/v1/object/public/',
        '/storage/v1/render/image/public/'
      );
      const url = new URL(renderUrl);
      url.searchParams.set('width', width.toString());
      url.searchParams.set('quality', q.toString());
      return url.toString();
    }
    // Legacy oversized PNG — return raw (can't transform >25MB files)
    return src;
  }

  // Local images, data URIs, etc.
  return src;
}
