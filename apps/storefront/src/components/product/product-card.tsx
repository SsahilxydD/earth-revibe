'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Star, Gift } from 'lucide-react';
import { cn, formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { trackWishlistToggle } from '@/lib/analytics';
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from '@/hooks/use-wishlist';
import { useAuthStore } from '@/stores/auth-store';
import { QuickAddModal } from './quick-add-modal';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  index?: number;
}

// Store-wide running offers (see /offers), surfaced as a small centered
// frosted-glass pill that slides up only when the card's swiper lands on the
// 2nd image — so the image + dots stay visible and offers read as a reward.
const OFFERS = [
  {
    tab: '100% Back',
    headline: 'First-order cashback',
    desc: 'Your entire first order comes back as loyalty points.',
  },
  {
    tab: '33% Return',
    headline: 'Year-on take-back',
    desc: 'Wear it a year, send it back, and earn 33% back as points.',
  },
] as const;

export function ProductCard({ product, index = 99 }: ProductCardProps) {
  const router = useRouter();
  const prefetched = useRef(false);
  const [heartBounce, setHeartBounce] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Guests have no wishlist — never fetch it for them (an unauthenticated
  // /wishlist call 401s, and the heart just routes guests to login on click).
  const { data: wishlistItems } = useWishlist({
    enabled: typeof window !== 'undefined' && isAuthenticated,
  });
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
      // Guests: go straight to login (with a returnUrl) instead of firing an
      // optimistic toggle that 401s and animates a heart that never sticks.
      if (!isAuthenticated) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        router.push(`/auth/login?returnUrl=${returnUrl}`);
        return;
      }
      setHeartBounce(true);
      setTimeout(() => setHeartBounce(false), 300);
      // Only bounce to login if the session actually died (401); other errors
      // are transient and the hook already reverts the optimistic update.
      const onError = (err: { status?: number }) => {
        if (err?.status === 401) {
          const returnUrl = encodeURIComponent(window.location.pathname);
          router.push(`/auth/login?returnUrl=${returnUrl}`);
        }
      };
      if (isWishlisted) {
        trackWishlistToggle({ id: product.id, name: product.name, added: false });
        removeFromWishlist.mutate(product.id, { onError });
      } else {
        trackWishlistToggle({ id: product.id, name: product.name, added: true });
        addToWishlist.mutate(product.id, { onError });
      }
    },
    [
      isAuthenticated,
      isWishlisted,
      product.id,
      product.name,
      addToWishlist,
      removeFromWishlist,
      router,
    ]
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
      hasSlider ? [sortedImages[imageCount - 1], ...sortedImages, sortedImages[0]] : sortedImages,
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

    if (typeof window !== 'undefined' && 'onscrollend' in window) {
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

  // Single data-driven status strip per tile. Stock comes from the live variants
  // in the payload, "best seller" from real sales (server-computed isBestSeller),
  // "new" from createdAt. Sold-out is shown by the overlay, not the strip.
  const almostOut = !isOutOfStock && totalStock > 0 && totalStock <= 5;
  const lowStock = !isOutOfStock && totalStock > 5 && totalStock <= 15;
  const isBestSeller = product.isBestSeller === true;
  const createdMs = new Date(product.createdAt).getTime();
  const isNew = Number.isFinite(createdMs) && Date.now() - createdMs < 14 * 24 * 60 * 60 * 1000;
  // Priority: critical stock urgency first, then merchandising, then recency.
  const statusBadge: { label: string; dot?: string; star?: boolean } | null = isOutOfStock
    ? null
    : almostOut
      ? { label: 'Almost out', dot: '#EF4444' }
      : isBestSeller
        ? { label: 'Best seller', star: true }
        : lowStock
          ? { label: 'Low stock', dot: '#F59E0B' }
          : isNew
            ? { label: 'New', dot: '#34D399' }
            : null;

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

        {/* Status strip — one data-driven label per tile (frosted gray glass).
            Only shown on the first image; hidden once the user swipes past it. */}
        {statusBadge && realIndex === 0 && (
          <div
            style={{
              position: 'absolute',
              top: 9,
              left: 9,
              zIndex: 5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              height: 14,
              padding: '0 6px',
              borderRadius: 2.5,
              background: 'rgba(60,60,60,0.34)',
              backdropFilter: 'blur(10px) saturate(140%)',
              WebkitBackdropFilter: 'blur(10px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.22)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
            }}
          >
            {statusBadge.star ? (
              <Star size={7} color="#F5C451" fill="#F5C451" strokeWidth={0} />
            ) : (
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 9999,
                  backgroundColor: statusBadge.dot,
                }}
              />
            )}
            <span
              style={{
                fontSize: 6.5,
                fontWeight: 500,
                letterSpacing: 0.6,
                color: '#FFF',
                textTransform: 'uppercase',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {statusBadge.label}
            </span>
          </div>
        )}

        {/* Sold out overlay — dim + corner-to-corner slash + label */}
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
            {/* Diagonal slash across the whole tile so it reads as unavailable
                at a glance. preserveAspectRatio="none" + non-scaling stroke keeps
                it corner-to-corner and a constant width on the 3:4 tile. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span
              style={{
                position: 'relative',
                fontSize: 10,
                fontWeight: 400,
                color: '#FFF',
                letterSpacing: 1.5,
              }}
            >
              SOLD OUT
            </span>
          </div>
        )}

        {/* Page indicator dots — white with a soft shadow so they read over any image */}
        {hasSlider && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 7,
              display: 'flex',
              gap: 5,
              pointerEvents: 'none',
            }}
          >
            {sortedImages.map((_, i) => {
              const active = i === realIndex;
              return (
                <span
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 9999,
                    backgroundColor: active ? '#FFF' : 'rgba(255,255,255,0.55)',
                    boxShadow: '0 0 2px rgba(0,0,0,0.35)',
                    transition: 'background-color 0.2s ease',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Offers glass sheet — frosted bottom panel from mid-image, only on the 2nd image */}
        {hasSlider && imageCount > 1 && (
          <div
            style={{
              // Small centered frosted pill that floats just above the dots, so the
              // photo stays clear and the dots read below it. Single line, the two
              // offer labels joined — compact and tidy, not a full-width panel.
              position: 'absolute',
              bottom: 22,
              left: '50%',
              zIndex: 6,
              maxWidth: 'calc(100% - 24px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 9999,
              fontFamily: 'var(--font-helvetica)',
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.3)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              opacity: realIndex === 1 ? 1 : 0,
              transform: realIndex === 1 ? 'translate(-50%, 0)' : 'translate(-50%, 8px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              pointerEvents: 'none',
            }}
          >
            <Gift size={11} color="#000" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: 0.5,
                color: '#000',
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {OFFERS.map((o) => o.tab).join(' · ')}
            </span>
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
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: isOutOfStock ? '#999' : '#000',
            textDecoration: isOutOfStock ? 'line-through' : 'none',
          }}
        >
          {formatPrice(product.price)}
        </span>
        {product.reviewCount > 0 && product.averageRating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <div style={{ display: 'flex', gap: 1 }}>
              {[0, 1, 2, 3, 4].map((i) => {
                const filled = i < Math.round(product.averageRating!);
                return (
                  <Star
                    key={i}
                    size={11}
                    color={filled ? '#121212' : '#D4D4D4'}
                    fill={filled ? '#121212' : 'none'}
                  />
                );
              })}
            </div>
            <span style={{ fontSize: 11, fontWeight: 400, color: '#000' }}>
              {product.averageRating.toFixed(1)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 300, color: '#999' }}>
              ({product.reviewCount})
            </span>
          </div>
        )}
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
