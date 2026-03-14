import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN")}`;
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Get the best image URL for a given width.
 * - For thumbnails/listings (width <= 600), prefer thumbnailUrl (Cloudflare) when available.
 * - For full-quality detail views (width > 600 or unspecified), use the original url (Supabase).
 * - Legacy Cloudinary URLs still get width transforms applied.
 */
export function getImageUrl(url: string, width?: number, thumbnailUrl?: string | null): string {
  if (!url) return "/placeholder.png";

  // For small sizes, use the thumbnail (Cloudflare) if available
  if (width && width <= 600 && thumbnailUrl) {
    // Cloudflare Image Delivery URLs support /w=N variant suffix
    if (thumbnailUrl.includes("imagedelivery.net")) {
      return thumbnailUrl.replace(/\/public$/, `/w=${width}`);
    }
    return thumbnailUrl;
  }

  // Legacy Cloudinary support
  if (width && url.includes("cloudinary.com")) {
    return url.replace("/upload/", `/upload/w_${width},f_auto,q_auto/`);
  }

  return url;
}

export function truncate(str: string, len: number): string {
  if (!str) return "";
  if (str.length <= len) return str;
  return `${str.slice(0, len).trimEnd()}...`;
}
