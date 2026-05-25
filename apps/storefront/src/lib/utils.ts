import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string | null | undefined): string {
  if (amount == null) return '₹0';
  // Prisma serializes Postgres `numeric` columns as strings — coerce so
  // callers that forget to Number() a product.price don't end up with
  // "0990990" string-concatenation garbage on the page.
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  // Always show whole rupees \u2014 round off, never expose paise/float artefacts.
  return `\u20B9${Math.round(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const day = d.getDate();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Format an UPPERCASE_SNAKE enum value for display (e.g. "IN_PROGRESS" → "IN PROGRESS"). */
export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

/**
 * Get the best image URL for a given width.
 * - For thumbnails/listings (width <= 600), prefer thumbnailUrl (Cloudflare) when available.
 * - For full-quality detail views (width > 600 or unspecified), use the original url (Supabase).
 * - Legacy Cloudinary URLs still get width transforms applied.
 * - Cloudflare URLs now request format=auto (WebP/AVIF) for smaller downloads.
 */
export function getImageUrl(url: string, width?: number, thumbnailUrl?: string | null): string {
  if (!url) return '/placeholder.png';

  // For small sizes, use the thumbnail (Cloudflare) if available
  if (width && width <= 600 && thumbnailUrl) {
    // Cloudflare Image Delivery URLs support /w=N,format=auto variant suffix
    if (thumbnailUrl.includes('imagedelivery.net')) {
      return thumbnailUrl.replace(/\/public$/, `/w=${width},format=auto`);
    }
    return thumbnailUrl;
  }

  // Cloudflare full-size — still request format=auto
  if (url.includes('imagedelivery.net')) {
    return url.replace(/\/public$/, width ? `/w=${width},format=auto` : '/format=auto');
  }

  // Legacy Cloudinary support
  if (width && url.includes('cloudinary.com')) {
    return url.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
  }

  return url;
}

/**
 * Tiny 1x1 SVG blur placeholder — eliminates the white flash before images load.
 * Matches next/image's blurDataURL format. The warm neutral color (#f0eeeb) matches
 * our product image backgrounds so the transition is seamless.
 * Pre-computed base64 so it works in both server and client components.
 */
export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmMGVlZWIiLz48L3N2Zz4=';

export function truncate(str: string, len: number): string {
  if (!str) return '';
  if (str.length <= len) return str;
  return `${str.slice(0, len).trimEnd()}...`;
}
