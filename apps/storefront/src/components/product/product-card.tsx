'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  index?: number;
}

export function ProductCard({ product, index = 99 }: ProductCardProps) {
  const router = useRouter();
  const prefetched = useRef(false);
  const [heartBounce, setHeartBounce] = useState(false);

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
      setHeartBounce(true);
      setTimeout(() => setHeartBounce(false), 300);
      if (isWishlisted) {
        trackWishlistToggle({ id: product.id, name: product.name, added: false });
        removeFromWishlist.mutate(product.id, { onError: () => router.push('/auth/login') });
      } else {
        trackWishlistToggle({ id: product.id, name: product.name, added: true });
        addToWishlist.mutate(product.id, { onError: () => router.push('/auth/login') });
      }
    },
    [isWishlisted, product.id, product.name, addToWishlist, removeFromWishlist, router]
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

  const variants = product.variants ?? [];
  const isOutOfStock = variants.length > 0 && variants.every((v) => v.stock <= 0);
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const isLowStock = !isOutOfStock && totalStock > 0 && totalStock <= 5;

  return (
    <div
      className="group"
      style={{ display: 'flex', flexDirection: 'column' }}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Image container */}
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

        {/* Wishlist heart — outside Link */}
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
            style={{
              transition: 'transform 0.2s ease, color 0.15s ease',
              transform: heartBounce ? 'scale(1.4)' : 'scale(1)',
            }}
            className={cn(isWishlisted ? 'fill-[#EF4444] text-[#EF4444]' : 'text-[#CCC]')}
          />
        </button>
      </div>

      {/* Info section — YUR-style typography (Helvetica, weight 400) */}
      <Link
        href={`/products/${product.slug}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          paddingTop: 10,
          paddingLeft: 10,
          paddingRight: 10,
          paddingBottom: 4,
          textDecoration: 'none',
          fontFamily: 'var(--font-helvetica)',
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: isOutOfStock ? '#999' : '#000',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            minHeight: 36,
          }}
        >
          {product.name}
        </p>
        <span style={{ fontSize: 12, fontWeight: 400, color: isOutOfStock ? '#999' : '#000' }}>
          {formatPrice(product.price)}
        </span>
      </Link>

    </div>
  );
}
