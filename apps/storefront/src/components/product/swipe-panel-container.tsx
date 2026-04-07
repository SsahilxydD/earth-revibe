'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { api } from '@/lib/api-client';
import { ProductDetail } from './product-detail';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { useIsTouchDevice } from '@/hooks/use-is-touch-device';
import { useProductNavStore } from '@/stores/product-nav-store';
import type { Product } from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COMMIT_DISTANCE_RATIO = 0.3;
const COMMIT_VELOCITY = 500;
const LOCK_DURATION = 350;
const SPRING_CONFIG = { type: 'spring' as const, stiffness: 300, damping: 30 };
const SWIPE_THRESHOLD = 10;

/* ------------------------------------------------------------------ */
/*  useViewportWidth                                                   */
/* ------------------------------------------------------------------ */

function useViewportWidth() {
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 390));
  useEffect(() => {
    const h = () => setVw(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return vw;
}

/* ------------------------------------------------------------------ */
/*  Preload hero image for a product                                   */
/* ------------------------------------------------------------------ */

const preloadedImages = new Set<string>();

function preloadHeroImage(product: Product | undefined) {
  if (!product) return;
  const img = product.images.find((i) => i.isPrimary) || product.images[0];
  if (!img || preloadedImages.has(img.url)) return;
  preloadedImages.add(img.url);
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = img.url;
  document.head.appendChild(link);
}

/* ------------------------------------------------------------------ */
/*  TapePanel — 3 slots: prev (0), center (1), next (2)               */
/* ------------------------------------------------------------------ */

function TapePanel({
  slug,
  slotIndex,
  tapeOffset,
  vw,
  isCenter,
}: {
  slug: string;
  slotIndex: number;
  tapeOffset: ReturnType<typeof useMotionValue<number>>;
  vw: number;
  isCenter: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // 3 panels: center is slot 1, so offset = (slotIndex - 1) * vw
  const x = useTransform(tapeOffset, (offset) => (slotIndex - 1) * vw + offset);

  const { data: product } = useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: ({ signal }) => api.get<Product>(`/products/${slug}`, signal),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Preload hero image as soon as data arrives
  useEffect(() => {
    if (product && !isCenter) preloadHeroImage(product);
  }, [product, isCenter]);

  // Reset scroll when slug changes
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (slug !== prevSlugRef.current) {
      prevSlugRef.current = slug;
      if (panelRef.current) panelRef.current.scrollTop = 0;
    }
  }, [slug]);

  if (!product) {
    return (
      <motion.div
        ref={panelRef}
        className="absolute inset-0 bg-white"
        style={{ x, willChange: 'transform' }}
      />
    );
  }

  return (
    <motion.div
      ref={panelRef}
      className="absolute inset-0 overflow-y-auto bg-white"
      style={{
        x,
        willChange: 'transform',
        contentVisibility: isCenter ? 'visible' : 'auto',
      }}
    >
      <ProductDetail product={product} isPreview={!isCenter} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  buildWindow — 3 slugs: [prev, center, next]                       */
/* ------------------------------------------------------------------ */

function buildWindow(
  centerSlug: string,
  getAdjacentSlugs: (slug: string) => { prev: string | null; next: string | null }
): string[] {
  const { prev, next } = getAdjacentSlugs(centerSlug);
  return [prev || centerSlug, centerSlug, next || centerSlug];
}

/* ------------------------------------------------------------------ */
/*  SwipePanelContainer                                                */
/* ------------------------------------------------------------------ */

interface SwipePanelContainerProps {
  initialProduct: Product;
  initialSlug: string;
}

export function SwipePanelContainer({ initialProduct, initialSlug }: SwipePanelContainerProps) {
  const vw = useViewportWidth();
  const isTouchDevice = useIsTouchDevice();
  const tapeOffset = useMotionValue(0);
  const lockRef = useRef(false);

  const [centerSlug, setCenterSlug] = useState(initialSlug);

  const { canSwipe, completeSwipe, prefetchAdjacent, getCachedProduct, getAdjacentSlugs } =
    useSwipeNavigation({ currentSlug: centerSlug });

  // Window in a ref for synchronous updates (no blink)
  const windowRef = useRef<string[]>(buildWindow(initialSlug, getAdjacentSlugs));
  const [, forceRender] = useReducer((c: number) => c + 1, 0);

  // Lock body scroll when swipe container is active — prevents footer from showing
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Rebuild window when store populates
  const allSlugs = useProductNavStore((s) => s.allSlugs);
  const ctxSlugs = useProductNavStore((s) => s.slugs);
  useEffect(() => {
    if (allSlugs.length > 1 || ctxSlugs.length > 1) {
      const rebuilt = buildWindow(windowRef.current[1], getAdjacentSlugs);
      if (rebuilt.join(',') !== windowRef.current.join(',')) {
        windowRef.current = rebuilt;
        forceRender();
      }
    }
  }, [allSlugs.length, ctxSlugs.length]);

  // Prefetch adjacent products
  useEffect(() => {
    prefetchAdjacent(windowRef.current[1]);
  }, [windowRef.current[1], prefetchAdjacent]);

  // Sync on server navigation
  useEffect(() => {
    if (initialSlug !== windowRef.current[1]) {
      windowRef.current = buildWindow(initialSlug, getAdjacentSlugs);
      setCenterSlug(initialSlug);
      tapeOffset.set(0);
      forceRender();
    }
  }, [initialSlug]);

  // Reset on resize
  useEffect(() => {
    const h = () => tapeOffset.set(0);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [tapeOffset]);

  /* ---------------------------------------------------------------- */
  /*  Touch handling                                                   */
  /* ---------------------------------------------------------------- */

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipingRef = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (lockRef.current) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    swipingRef.current = null;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || lockRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;

      if (swipingRef.current === null) {
        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
          swipingRef.current = Math.abs(dx) > Math.abs(dy);
        }
        return;
      }

      if (!swipingRef.current) return;

      e.preventDefault();
      tapeOffset.set(dx);
    },
    [tapeOffset]
  );

  const commitSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const w = windowRef.current;
      // 3-panel: center is index 1, next is 2, prev is 0
      const targetSlug = direction === 'left' ? w[2] : w[0];

      if (!targetSlug || targetSlug === w[1]) {
        animate(tapeOffset, 0, SPRING_CONFIG);
        return;
      }

      if ('vibrate' in navigator) navigator.vibrate(10);
      lockRef.current = true;

      const targetX = direction === 'left' ? -vw : vw;

      animate(tapeOffset, targetX, {
        ...SPRING_CONFIG,
        onComplete: () => {
          const newCenterSlug = targetSlug;

          // Rebuild 3-panel window around new center
          const newWindow = buildWindow(newCenterSlug, getAdjacentSlugs);

          // Synchronous: ref + MotionValue before React renders
          windowRef.current = newWindow;
          tapeOffset.set(0);
          setCenterSlug(newCenterSlug);
          forceRender();

          const newProduct = getCachedProduct(newCenterSlug);
          if (newProduct) {
            completeSwipe(newCenterSlug, newProduct);
          }

          // Prefetch the new edges
          prefetchAdjacent(newCenterSlug);

          setTimeout(() => {
            lockRef.current = false;
          }, LOCK_DURATION);
        },
      });
    },
    [vw, getAdjacentSlugs, getCachedProduct, completeSwipe, prefetchAdjacent, tapeOffset]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !swipingRef.current || lockRef.current) {
      touchStartRef.current = null;
      swipingRef.current = null;
      return;
    }

    const startTime = touchStartRef.current.time;
    const currentOffset = tapeOffset.get();
    const elapsed = Math.max(Date.now() - startTime, 1);
    const velocity = (currentOffset / elapsed) * 1000;

    touchStartRef.current = null;
    swipingRef.current = null;

    const distance = Math.abs(currentOffset);
    const speed = Math.abs(velocity);
    const committed = distance > vw * COMMIT_DISTANCE_RATIO || speed > COMMIT_VELOCITY;

    if (!committed) {
      animate(tapeOffset, 0, SPRING_CONFIG);
      return;
    }

    commitSwipe(currentOffset < 0 ? 'left' : 'right');
  }, [vw, tapeOffset, commitSwipe]);

  // Popstate
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/products\/(.+)/);
      if (match && match[1] !== windowRef.current[1]) {
        const slug = match[1];
        const cached = getCachedProduct(slug);
        if (cached) {
          windowRef.current = buildWindow(slug, getAdjacentSlugs);
          tapeOffset.set(0);
          setCenterSlug(slug);
          forceRender();
        } else {
          window.location.reload();
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getCachedProduct, getAdjacentSlugs, tapeOffset]);

  // Non-swipe fallback
  if (!canSwipe || !isTouchDevice) {
    return <ProductDetail product={initialProduct} />;
  }

  const currentWindow = windowRef.current;

  return (
    <div
      className="fixed inset-0 z-30 overflow-hidden bg-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {currentWindow.map((slug, i) => (
        <TapePanel
          key={i}
          slug={slug}
          slotIndex={i}
          tapeOffset={tapeOffset}
          vw={vw}
          isCenter={i === 1}
        />
      ))}
    </div>
  );
}
