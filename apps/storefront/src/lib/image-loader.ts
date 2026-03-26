import type { ImageLoaderProps } from "next/image";

/**
 * Custom Next.js image loader.
 *
 * Routes Supabase Storage URLs through Supabase's built-in image transformation
 * API so images are optimised and served directly from Supabase's CDN — never
 * proxied through Vercel's /_next/image endpoint, which would count as cached egress.
 *
 * All other URLs (Cloudflare imagedelivery.net, already-transformed CDN URLs)
 * are returned as-is because getImageUrl() has already applied their transforms.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Supabase Storage object URLs → Supabase render/transform API
  if (src.includes(".supabase.co/storage/v1/object/public/")) {
    const renderUrl = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    const url = new URL(renderUrl);
    url.searchParams.set("width", width.toString());
    url.searchParams.set("quality", (quality ?? 75).toString());
    return url.toString();
  }

  // Everything else (Cloudflare, legacy Cloudinary) is already transformed
  // by getImageUrl() — pass through unchanged.
  return src;
}
