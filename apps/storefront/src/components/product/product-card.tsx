'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { cn, formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { trackWishlistToggle } from '@/lib/analytics';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/use-wishlist';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  /** Index in the grid — first 8 cards load eagerly (above the fold) */
  index?: number;
}

export function ProductCard({ product, index = 99 }: ProductCardProps) {
  const router = useRouter();
  const prefetched = useRef(false);

  // Wishlist — real API state
  const { data: wishlistItems } = useWishlist({ enabled: typeof window !== 'undefined' });
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const isWishlisted = useMemo(
    () => wishlistItems?.some((item) => item.product?.id === product.id) ?? false,
    [wishlistItems, product.id]
  );

  const toggleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isWishlisted) {
        trackWishlistToggle({ id: product.id, name: product.name, added: false });
        removeFromWishlist.mutate(product.id);
      } else {
        trackWishlistToggle({ id: product.id, name: product.name, added: true });
        addToWishlist.mutate(product.id);
      }
    },
    [isWishlisted, product.id, addToWishlist, removeFromWishlist]
  );

  // First 4 cards are above the fold on mobile (2-col grid) — load eagerly
  const isAboveFold = index < 4;

  // Prefetch the product page on first touch/hover so navigation is instant
  const handlePrefetch = useCallback(() => {
    if (!prefetched.current) {
      prefetched.current = true;
      router.prefetch(`/products/${product.slug}`);
    }
  }, [router, product.slug]);

  const images = product.images ?? [];

  const primaryImage = useMemo(() => {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted.find((img) => img.isPrimary) || sorted[0] || null;
  }, [images]);

  const secondaryImage = useMemo(() => {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const primary = sorted.find((img) => img.isPrimary) || sorted[0];
    return sorted.find((img) => img !== primary) || null;
  }, [images]);

  // Preload secondary image into browser cache so hover swap is instant
  const secondaryUrl = useMemo(
    () =>
      secondaryImage ? getImageUrl(secondaryImage.url, 600, secondaryImage.thumbnailUrl) : null,
    [secondaryImage]
  );
  useEffect(() => {
    if (!secondaryUrl) return;
    const img = new window.Image();
    img.src = secondaryUrl;
  }, [secondaryUrl]);

  const isOnSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;

  const variants = product.variants ?? [];
  const isOutOfStock = variants.length > 0 && variants.every((v) => v.stock <= 0);

  return (
    <div className="group relative" onMouseEnter={handlePrefetch} onTouchStart={handlePrefetch}>
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image container — fixed aspect ratio prevents layout shift */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f5f5f5]">
          {primaryImage && (
            <Image
              src={getImageUrl(primaryImage.url, 600, primaryImage.thumbnailUrl)}
              alt={primaryImage.altText || product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={isAboveFold}
              loading={isAboveFold ? 'eager' : 'lazy'}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className={cn(
                'object-cover transition-opacity duration-500',
                secondaryImage ? 'group-hover:opacity-0' : ''
              )}
            />
          )}
          {secondaryImage && (
            <Image
              src={secondaryUrl!}
              alt={secondaryImage.altText || product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className="absolute inset-0 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}

          {/* Sold out overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-sold-out)]">
                Sold Out
              </span>
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={toggleWishlist}
            className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition-colors hover:bg-white"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              size={14}
              className={cn(
                'transition-colors',
                isWishlisted ? 'fill-[var(--color-sale)] text-[var(--color-sale)]' : 'text-black/60'
              )}
            />
          </button>
        </div>

        {/* Product info */}
        <div className="mt-2 px-0.5">
          <h3 className="line-clamp-2 text-xs leading-snug text-black">{product.name}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            {isOnSale ? (
              <>
                <span className="text-xs font-medium text-black">{formatPrice(product.price)}</span>
                <span className="text-[10px] text-black/40 line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              </>
            ) : (
              <span className="text-xs font-medium text-black">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
