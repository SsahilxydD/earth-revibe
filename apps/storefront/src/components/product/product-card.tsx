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

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const initialScrollSetRef = useRef(false);

  // Initial scroll position: skip the leading clone so we start on the real first slide.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !hasSlider) return;
    const setInitial = () => {
      const w = el.offsetWidth;
      if (!w) return;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = w;
      initialScrollSetRef.current = true;
      requestAnimationFrame(() => {
        if (el) el.style.scrollBehavior = '';
      });
    };
    if (el.offsetWidth > 0) setInitial();
    else requestAnimationFrame(setInitial);
  }, [hasSlider, sortedImages]);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    if (!w) return;
    const idx = Math.round(el.scrollLeft / w);
    let real = idx;
    if (hasSlider) {
      if (idx === 0) real = imageCount - 1;
      else if (idx === imageCount + 1) real = 0;
      else real = idx - 1;
    }
    setActiveIndex(real);
  }, [hasSlider, imageCount]);

  // Loop jump: when scroll settles on a clone, jump to its real twin without animation.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !hasSlider) return;

    const jumpIfOnClone = () => {
      if (!initialScrollSetRef.current) return;
      const w = el.offsetWidth;
      if (!w) return;
      const idx = Math.round(el.scrollLeft / w);
      if (idx === 0 || idx === imageCount + 1) {
        const target = idx === 0 ? imageCount : 1;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft = target * w;
        requestAnimationFrame(() => {
          if (el) el.style.scrollBehavior = '';
        });
      }
    };

    if ('onscrollend' in el) {
      el.addEventListener('scrollend', jumpIfOnClone);
      return () => el.removeEventListener('scrollend', jumpIfOnClone);
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(jumpIfOnClone, 140);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (t) clearTimeout(t);
    };
  }, [hasSlider, imageCount]);

  const realIndex = activeIndex;

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
          ref={scrollerRef}
          onScroll={handleScroll}
          className="hide-scrollbar"
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            overflowX: hasSlider ? 'auto' : 'hidden',
            overflowY: 'hidden',
            scrollSnapType: hasSlider ? 'x mandatory' : 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {slides.map((img, i) => (
            <Link
              key={`slide-${i}`}
              href={`/products/${product.slug}`}
              draggable={false}
              style={{
                flex: '0 0 100%',
                height: '100%',
                position: 'relative',
                display: 'block',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
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
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
            minHeight: 18,
          }}
        >
          {product.name}
        </p>
        <span style={{ fontSize: 12, fontWeight: 400, color: isOutOfStock ? '#999' : '#000' }}>
          {formatPrice(product.price)}
        </span>
      </Link>

      <div style={{ padding: '0 10px 10px 10px' }}>
        <button
          onClick={handleAddToBag}
          disabled={isOutOfStock}
          style={{
            width: '100%',
            height: 38,
            boxSizing: 'border-box',
            backgroundColor: 'transparent',
            color: isOutOfStock ? '#999' : '#000',
            border: isOutOfStock ? '0.5px solid #E5E5E5' : '0.5px solid #000',
            borderRadius: 0,
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: 1.5,
            fontFamily: 'var(--font-helvetica)',
            cursor: isOutOfStock ? 'default' : 'pointer',
          }}
        >
          {isOutOfStock ? 'NOTIFY ME' : 'ADD TO BAG'}
        </button>
      </div>

      {showQuickAdd && <QuickAddModal product={product} onClose={() => setShowQuickAdd(false)} />}
    </div>
  );
}
