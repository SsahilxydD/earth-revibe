'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Plus } from 'lucide-react';
import { cn, formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { trackWishlistToggle } from '@/lib/analytics';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/use-wishlist';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 99 }: ProductCardProps) {
  const router = useRouter();
  const prefetched = useRef(false);
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();

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
    [isWishlisted, product.id, product.name, addToWishlist, removeFromWishlist]
  );

  const isAboveFold = index < 4;

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
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const isLowStock = !isOutOfStock && totalStock > 0 && totalStock <= 5;

  // Color swatches from variants
  const colorSwatches = useMemo(() => {
    const colors = new Set<string>();
    variants.forEach((v) => {
      if (v.color) colors.add(v.color);
    });
    return Array.from(colors).slice(0, 4);
  }, [variants]);

  // Discount percentage
  const discountPct = isOnSale
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  // Savings amount
  const savings = isOnSale ? product.compareAtPrice! - product.price : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    const defaultVariant = variants.find((v) => v.stock > 0) || variants[0];
    // If no variants available, create a fallback entry from the product itself
    const variantId = defaultVariant?.id || `${product.id}-default`;
    addItem({
      id: variantId,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url || '',
      price: product.price,
      compareAtPrice: product.compareAtPrice || undefined,
      size: defaultVariant?.size || 'M',
      color: defaultVariant?.color || 'Default',
      maxQuantity: defaultVariant?.stock && defaultVariant.stock > 0 ? defaultVariant.stock : 10,
    });
    addToast('Added to bag', 'success');
  };

  return (
    <div
      className="group"
      style={{ display: 'flex', flexDirection: 'column' }}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Image container — heart button is OUTSIDE Link so it works */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          overflow: 'hidden',
          backgroundColor: '#F5F5F5',
        }}
      >
        <Link
          href={`/products/${product.slug}`}
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
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

          {/* Badges — top left */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {product.tags?.includes('new-arrival') && (
              <span
                style={{
                  display: 'inline-flex',
                  height: 20,
                  padding: '0 8px',
                  alignItems: 'center',
                  backgroundColor: '#000',
                  fontSize: 8,
                  fontWeight: 400,
                  color: '#FFF',
                  letterSpacing: 1.5,
                }}
              >
                NEW
              </span>
            )}
            {product.tags?.includes('bestseller') && (
              <span
                style={{
                  display: 'inline-flex',
                  height: 20,
                  padding: '0 8px',
                  alignItems: 'center',
                  backgroundColor: '#000',
                  fontSize: 8,
                  fontWeight: 400,
                  color: '#FFF',
                  letterSpacing: 1.5,
                }}
              >
                BESTSELLER
              </span>
            )}
            {isOnSale && discountPct > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  height: 20,
                  padding: '0 8px',
                  alignItems: 'center',
                  backgroundColor: '#FFF',
                  border: '1px solid #E5E5E5',
                  fontSize: 8,
                  fontWeight: 400,
                  color: '#000',
                  letterSpacing: 0.5,
                }}
              >
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Urgency — bottom left */}
          {isLowStock && (
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                display: 'inline-flex',
                height: 18,
                padding: '0 8px',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#FFF',
              }}
            >
              <span
                style={{ width: 5, height: 5, borderRadius: 9999, backgroundColor: '#EF4444' }}
              />
              <span style={{ fontSize: 8, fontWeight: 400, color: '#000', letterSpacing: 0.3 }}>
                Only {totalStock} left
              </span>
            </div>
          )}

          {/* Sold out overlay */}
          {isOutOfStock && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.4)',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 400, color: '#FFF', letterSpacing: 1.5 }}>
                SOLD OUT
              </span>
            </div>
          )}
        </Link>

        {/* Wishlist heart — OUTSIDE Link so onClick works */}
        <button
          onClick={toggleWishlist}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={16}
            className={cn(
              'transition-colors',
              isWishlisted ? 'fill-[#EF4444] text-[#EF4444]' : 'text-[#CCC]'
            )}
          />
        </button>
      </div>

      {/* Info section — fixed minHeight so QUICK ADD aligns across cards */}
      <Link
        href={`/products/${product.slug}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minHeight: 80,
          paddingTop: 8,
          textDecoration: 'none',
        }}
      >
        {/* Name — clamped to 2 lines with fixed line-height = consistent height */}
        <p
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: isOutOfStock ? '#999' : '#000',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            minHeight: 34,
          }}
        >
          {product.name}
        </p>

        {/* Price + savings on same row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 300, color: isOutOfStock ? '#999' : '#000' }}>
            {formatPrice(product.price)}
          </span>
          {isOnSale && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 300,
                color: '#CCC',
                textDecoration: 'line-through',
              }}
            >
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
          {isOnSale && savings > 0 && !isOutOfStock && (
            <span style={{ fontSize: 9, fontWeight: 400, color: '#22C55E' }}>
              Save {formatPrice(savings)}
            </span>
          )}
        </div>

        {/* Color swatches */}
        {colorSwatches.length > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {colorSwatches.map((color) => (
              <span
                key={color}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  backgroundColor:
                    color.toLowerCase() === 'white'
                      ? '#FFF'
                      : color.toLowerCase() === 'black'
                        ? '#1C1C1C'
                        : color,
                  border: color.toLowerCase() === 'white' ? '1px solid #E5E5E5' : 'none',
                }}
              />
            ))}
          </div>
        )}
      </Link>

      {/* Quick Add / Notify Me button — 34px height */}
      {isOutOfStock ? (
        <button
          style={{
            width: '100%',
            height: 34,
            border: '1px solid #E5E5E5',
            backgroundColor: 'transparent',
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: 1.5,
            color: '#999',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          NOTIFY ME
        </button>
      ) : (
        <button
          onClick={handleQuickAdd}
          style={{
            width: '100%',
            height: 34,
            border: '1px solid #000',
            backgroundColor: 'transparent',
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: 1.5,
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Plus size={12} />
          QUICK ADD
        </button>
      )}
    </div>
  );
}
