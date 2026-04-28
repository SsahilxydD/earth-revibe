'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { cn, formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { trackWishlistToggle } from '@/lib/analytics';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/use-wishlist';
import { QuickAddModal } from './quick-add-modal';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 99 }: ProductCardProps) {
  const router = useRouter();
  const prefetched = useRef(false);
  const [heartBounce, setHeartBounce] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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

  const sortedImages = useMemo(() => {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const primary = sorted.find((img) => img.isPrimary);
    if (primary) return [primary, ...sorted.filter((img) => img !== primary)];
    return sorted;
  }, [images]);

  const imageCount = sortedImages.length;
  const hasSlider = imageCount > 1;
  // Clone last + first for seamless infinite loop. Internal index 1..N = real slides.
  const slides = useMemo(
    () =>
      hasSlider
        ? [sortedImages[imageCount - 1], ...sortedImages, sortedImages[0]]
        : sortedImages,
    [hasSlider, sortedImages, imageCount]
  );

  const [slideIndex, setSlideIndex] = useState(hasSlider ? 1 : 0);
  const [animating, setAnimating] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, dx: 0, dragging: false, width: 0, moved: false });

  const realIndex = hasSlider
    ? slideIndex === 0
      ? imageCount - 1
      : slideIndex === imageCount + 1
        ? 0
        : slideIndex - 1
    : 0;

  // After a clone-slide jump, re-enable transitions on next frame.
  useEffect(() => {
    if (animating) return;
    const id = requestAnimationFrame(() => setAnimating(true));
    return () => cancelAnimationFrame(id);
  }, [animating]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform' || e.target !== e.currentTarget) return;
    if (!hasSlider) return;
    if (slideIndex === 0) {
      setAnimating(false);
      setSlideIndex(imageCount);
    } else if (slideIndex === imageCount + 1) {
      setAnimating(false);
      setSlideIndex(1);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasSlider) return;
    dragRef.current = {
      startX: e.clientX,
      dx: 0,
      dragging: true,
      width: e.currentTarget.offsetWidth,
      moved: false,
    };
    setAnimating(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.dragging) return;
    const dx = e.clientX - drag.startX;
    drag.dx = dx;
    if (Math.abs(dx) > 5) drag.moved = true;
    if (trackRef.current && drag.width > 0) {
      trackRef.current.style.transform = `translate3d(${-slideIndex * drag.width + dx}px, 0, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.dragging) return;
    drag.dragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const dx = drag.dx;
    setAnimating(true);
    if (Math.abs(dx) > 50) {
      setSlideIndex((i) => (dx < 0 ? i + 1 : i - 1));
    } else if (trackRef.current) {
      trackRef.current.style.transform = '';
    }
  };

  const suppressClickIfDragged = (e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  const variants = product.variants ?? [];
  const isOutOfStock = variants.length > 0 && variants.every((v) => v.stock <= 0);
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const isLowStock = !isOutOfStock && totalStock > 0 && totalStock <= 5;

  const handleAddToBag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setShowQuickAdd(true);
  };

  return (
    <div
      className="group"
      style={{ display: 'flex', flexDirection: 'column' }}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Image container — swipe slider */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3/4',
          overflow: 'hidden',
          backgroundColor: '#F5F5F5',
        }}
      >
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTransitionEnd={handleTransitionEnd}
          onClickCapture={suppressClickIfDragged}
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translate3d(-${slideIndex * 100}%, 0, 0)`,
            transition: animating ? 'transform 0.35s cubic-bezier(0.25,0.1,0.25,1)' : 'none',
            touchAction: 'pan-y',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {slides.map((img, i) => (
            <Link
              key={`${img.url}-${i}`}
              href={`/products/${product.slug}`}
              draggable={false}
              style={{
                position: 'relative',
                flex: '0 0 100%',
                height: '100%',
                display: 'block',
              }}
            >
              <Image
                src={getImageUrl(img.url, 600, img.thumbnailUrl)}
                alt={img.altText || product.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={isAboveFold && i === (hasSlider ? 1 : 0)}
                loading={isAboveFold && i === (hasSlider ? 1 : 0) ? 'eager' : 'lazy'}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                draggable={false}
                className="object-cover pointer-events-none"
              />
            </Link>
          ))}
        </div>

        {/* Badges — top left (above slider) */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            pointerEvents: 'none',
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
              zIndex: 5,
              display: 'inline-flex',
              height: 18,
              padding: '0 8px',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#FFF',
              pointerEvents: 'none',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 9999, backgroundColor: '#EF4444' }} />
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
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 400, color: '#FFF', letterSpacing: 1.5 }}>
              SOLD OUT
            </span>
          </div>
        )}

        {/* Page indicator dots */}
        {hasSlider && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 5,
              display: 'flex',
              gap: 5,
              pointerEvents: 'none',
            }}
          >
            {sortedImages.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 9999,
                  backgroundColor: i === realIndex ? '#FFF' : 'rgba(255,255,255,0.5)',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </div>
        )}

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

      <button
        onClick={handleAddToBag}
        disabled={isOutOfStock}
        style={{
          width: 'calc(100% - 20px)',
          margin: '10px',
          height: 38,
          backgroundColor: isOutOfStock ? 'transparent' : '#000',
          color: isOutOfStock ? '#999' : '#FFF',
          border: isOutOfStock ? '1px solid #E5E5E5' : 'none',
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: 1.5,
          fontFamily: 'var(--font-helvetica)',
          cursor: isOutOfStock ? 'default' : 'pointer',
        }}
      >
        {isOutOfStock ? 'NOTIFY ME' : 'ADD TO BAG'}
      </button>

      {showQuickAdd && <QuickAddModal product={product} onClose={() => setShowQuickAdd(false)} />}
    </div>
  );
}
