'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
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
/** Minimum horizontal px before we claim the gesture as a swipe (vs vertical scroll) */
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
  isCenter,
}: {
  slug: string;
  slotIndex: number;
  tapeOffset: ReturnType<typeof useMotionValue<number>>;
  vw: number;
  isCenter: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const x = useTransform(tapeOffset, (offset) => (slotIndex - 2) * vw + offset);

  const { data: product } = useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: ({ signal }) => api.get<Product>(`/products/${slug}`, signal),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Reset scroll when this slot receives a new slug
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (slug !== prevSlugRef.current) {
      prevSlugRef.current = slug;
      if (panelRef.current) panelRef.current.scrollTop = 0;
    }
  }, [slug]);

  if (!product) {
    return <motion.div ref={panelRef} className="absolute inset-0 bg-white" style={{ x }} />;
  }

  return (
    <motion.div ref={panelRef} className="absolute inset-0 overflow-y-auto bg-white" style={{ x }}>
      <ProductDetail product={product} isPreview={!isCenter} />
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

  const [windowSlugs, setWindowSlugs] = useState<string[]>(() =>
    buildWindow(initialSlug, getAdjacentSlugs)
  );

  // Rebuild window when store populates
  const allSlugs = useProductNavStore((s) => s.allSlugs);
  const ctxSlugs = useProductNavStore((s) => s.slugs);
  useEffect(() => {
    if (allSlugs.length > 1 || ctxSlugs.length > 1) {
      const rebuilt = buildWindow(windowSlugs[2], getAdjacentSlugs);
      if (rebuilt.join(',') !== windowSlugs.join(',')) {
        setWindowSlugs(rebuilt);
      }
    }
  }, [allSlugs.length, ctxSlugs.length]);

  // Prefetch
  useEffect(() => {
    prefetchAdjacent(windowSlugs[2]);
    prefetchAdjacent(windowSlugs[0]);
    prefetchAdjacent(windowSlugs[4]);
  }, [windowSlugs[0], windowSlugs[2], windowSlugs[4], prefetchAdjacent]);

  // Sync on server navigation
  useEffect(() => {
    if (initialSlug !== windowSlugs[2]) {
      setWindowSlugs(buildWindow(initialSlug, getAdjacentSlugs));
      setCenterSlug(initialSlug);
      tapeOffset.set(0);
    }
  }, [initialSlug]);

  // Cancel drag on resize
  useEffect(() => {
    const h = () => {
      tapeOffset.set(0);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [tapeOffset]);

  /* ---------------------------------------------------------------- */
  /*  Manual touch handling — updates tapeOffset directly              */
  /* ---------------------------------------------------------------- */

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipingRef = useRef<boolean | null>(null); // null = undecided, true = horizontal swipe, false = vertical scroll

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

      // Decide direction on first significant movement
      if (swipingRef.current === null) {
        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
          swipingRef.current = Math.abs(dx) > Math.abs(dy);
        }
        return;
      }

      // If vertical scroll, let browser handle it
      if (!swipingRef.current) return;

      // Horizontal swipe — prevent scroll and update tape offset
      e.preventDefault();
      tapeOffset.set(dx);
    },
    [tapeOffset]
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
    const velocity = (currentOffset / elapsed) * 1000; // px/s

    touchStartRef.current = null;
    swipingRef.current = null;

    const distance = Math.abs(currentOffset);
    const speed = Math.abs(velocity);
    const committed = distance > vw * COMMIT_DISTANCE_RATIO || speed > COMMIT_VELOCITY;

    if (!committed) {
      animate(tapeOffset, 0, SPRING_CONFIG);
      return;
    }

    const goingLeft = currentOffset < 0;
    const direction: 'left' | 'right' = goingLeft ? 'left' : 'right';
    const targetSlug = direction === 'left' ? windowSlugs[3] : windowSlugs[1];

    if (!targetSlug || targetSlug === windowSlugs[2]) {
      animate(tapeOffset, 0, SPRING_CONFIG);
      return;
    }

    if ('vibrate' in navigator) navigator.vibrate(10);

    lockRef.current = true;
    const targetX = direction === 'left' ? -vw : vw;

    animate(tapeOffset, targetX, {
      ...SPRING_CONFIG,
      onComplete: () => {
        const newCenterSlug = direction === 'left' ? windowSlugs[3] : windowSlugs[1];
        const newEdge =
          direction === 'left'
            ? getAdjacentSlugs(windowSlugs[4]).next || windowSlugs[4]
            : getAdjacentSlugs(windowSlugs[0]).prev || windowSlugs[0];

        const newWindow =
          direction === 'left'
            ? [...windowSlugs.slice(1), newEdge]
            : [newEdge, ...windowSlugs.slice(0, 4)];

        tapeOffset.set(0);
        flushSync(() => {
          setWindowSlugs(newWindow);
          setCenterSlug(newCenterSlug);
        });

        const newProduct = getCachedProduct(newCenterSlug);
        if (newProduct) {
          completeSwipe(newCenterSlug, newProduct);
        }

        setTimeout(() => {
          lockRef.current = false;
        }, LOCK_DURATION);
      },
    });
  }, [vw, windowSlugs, getAdjacentSlugs, getCachedProduct, completeSwipe, tapeOffset]);

  // Popstate for back/forward
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/products\/(.+)/);
      if (match && match[1] !== windowSlugs[2]) {
        const slug = match[1];
        const cached = getCachedProduct(slug);
        if (cached) {
          tapeOffset.set(0);
          flushSync(() => {
            setWindowSlugs(buildWindow(slug, getAdjacentSlugs));
            setCenterSlug(slug);
          });
        } else {
          window.location.reload();
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [windowSlugs, getCachedProduct, getAdjacentSlugs, tapeOffset]);

  // Non-swipe fallback
  if (!canSwipe || !isTouchDevice) {
    return <ProductDetail product={initialProduct} />;
  }

  return (
    <div
      className="relative w-screen overflow-hidden"
      style={{ height: '100dvh' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {windowSlugs.map((slug, i) => (
        <TapePanel
          key={i}
          slug={slug}
          slotIndex={i}
          tapeOffset={tapeOffset}
          vw={vw}
          isCenter={i === 2}
        />
      ))}
    </div>
  );
}
