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
/*  TapePanel                                                          */
/* ------------------------------------------------------------------ */

function TapePanel({
  slug,
  slotIndex,
  tapeOffset,
  vw,
}: {
  slug: string;
  slotIndex: number;
  tapeOffset: ReturnType<typeof useMotionValue<number>>;
  vw: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const x = useTransform(tapeOffset, (offset) => (slotIndex - 2) * vw + offset);

  const { data: product } = useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: ({ signal }) => api.get<Product>(`/products/${slug}`, signal),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (slug !== prevSlugRef.current) {
      prevSlugRef.current = slug;
      if (panelRef.current) panelRef.current.scrollTop = 0;
    }
  }, [slug]);

  if (!product) {
    return <motion.div ref={panelRef} className="absolute inset-0 bg-[#FAF7F0]" style={{ x }} />;
  }

  return (
    <motion.div
      ref={panelRef}
      className="absolute inset-0 overflow-y-auto bg-[#FAF7F0]"
      style={{ x }}
    >
      <ProductDetail product={product} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  buildWindow                                                        */
/* ------------------------------------------------------------------ */

function buildWindow(
  centerSlug: string,
  getAdjacentSlugs: (slug: string) => { prev: string | null; next: string | null }
): string[] {
  const { prev: p1, next: n1 } = getAdjacentSlugs(centerSlug);
  const prev1 = p1 || centerSlug;
  const next1 = n1 || centerSlug;
  const { prev: p2 } = getAdjacentSlugs(prev1);
  const { next: n2 } = getAdjacentSlugs(next1);
  const prev2 = p2 || prev1;
  const next2 = n2 || next1;
  return [prev2, prev1, centerSlug, next1, next2];
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

  // Window in a ref — updated synchronously with MotionValue, no blink
  const windowRef = useRef<string[]>(buildWindow(initialSlug, getAdjacentSlugs));
  // Counter to trigger re-render after ref update
  const [, forceRender] = useReducer((c: number) => c + 1, 0);

  // Rebuild window when store populates
  const allSlugs = useProductNavStore((s) => s.allSlugs);
  const ctxSlugs = useProductNavStore((s) => s.slugs);
  useEffect(() => {
    if (allSlugs.length > 1 || ctxSlugs.length > 1) {
      const rebuilt = buildWindow(windowRef.current[2], getAdjacentSlugs);
      if (rebuilt.join(',') !== windowRef.current.join(',')) {
        windowRef.current = rebuilt;
        forceRender();
      }
    }
  }, [allSlugs.length, ctxSlugs.length]);

  // Prefetch
  useEffect(() => {
    const w = windowRef.current;
    prefetchAdjacent(w[2]);
    prefetchAdjacent(w[0]);
    prefetchAdjacent(w[4]);
  }, [windowRef.current[2], prefetchAdjacent]);

  // Sync on server navigation
  useEffect(() => {
    if (initialSlug !== windowRef.current[2]) {
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
      const targetSlug = direction === 'left' ? w[3] : w[1];

      if (!targetSlug || targetSlug === w[2]) {
        animate(tapeOffset, 0, SPRING_CONFIG);
        return;
      }

      if ('vibrate' in navigator) navigator.vibrate(10);
      lockRef.current = true;

      const targetX = direction === 'left' ? -vw : vw;

      animate(tapeOffset, targetX, {
        ...SPRING_CONFIG,
        onComplete: () => {
          const newCenterSlug = direction === 'left' ? w[3] : w[1];
          const newEdge =
            direction === 'left'
              ? getAdjacentSlugs(w[4]).next || w[4]
              : getAdjacentSlugs(w[0]).prev || w[0];

          const newWindow =
            direction === 'left' ? [...w.slice(1), newEdge] : [newEdge, ...w.slice(0, 4)];

          // BOTH updates happen synchronously before React renders.
          // The ref update is instant. tapeOffset.set is instant.
          // Then forceRender triggers ONE render with both already applied.
          windowRef.current = newWindow;
          tapeOffset.set(0);
          setCenterSlug(newCenterSlug);
          forceRender();

          const newProduct = getCachedProduct(newCenterSlug);
          if (newProduct) {
            completeSwipe(newCenterSlug, newProduct);
          }

          setTimeout(() => {
            lockRef.current = false;
          }, LOCK_DURATION);
        },
      });
    },
    [vw, getAdjacentSlugs, getCachedProduct, completeSwipe, tapeOffset]
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
      if (match && match[1] !== windowRef.current[2]) {
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

  if (!canSwipe || !isTouchDevice) {
    return <ProductDetail product={initialProduct} />;
  }

  const currentWindow = windowRef.current;

  return (
    <div
      className="relative w-screen overflow-hidden"
      style={{ height: '100dvh' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {currentWindow.map((slug, i) => (
        <TapePanel key={i} slug={slug} slotIndex={i} tapeOffset={tapeOffset} vw={vw} />
      ))}
    </div>
  );
}
