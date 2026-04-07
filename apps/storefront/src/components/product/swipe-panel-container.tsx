'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';
import { api } from '@/lib/api-client';
import { ProductDetail } from './product-detail';
import { EdgePeek } from './edge-peek';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import type { Product } from '@/types';

interface SwipePanelContainerProps {
  initialProduct: Product;
  initialSlug: string;
}

interface PanelData {
  slug: string;
  product: Product;
}

/** Commit threshold: 30% of viewport width */
const COMMIT_DISTANCE_RATIO = 0.3;
/** Minimum velocity (px/s) to commit even if distance is below threshold */
const COMMIT_VELOCITY = 500;
/** Lock duration after a swipe commit (ms) */
const LOCK_DURATION = 350;

const SPRING_CONFIG = { type: 'spring' as const, stiffness: 300, damping: 30 };

function useViewportWidth() {
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 390));

  useEffect(() => {
    const handleResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return vw;
}

export function SwipePanelContainer({ initialProduct, initialSlug }: SwipePanelContainerProps) {
  const [current, setCurrent] = useState<PanelData>({ slug: initialSlug, product: initialProduct });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentPanelRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);

  const dragX = useMotionValue(0);
  const vw = useViewportWidth();

  // Parallax: scale and opacity of current panel during drag
  const currentScale = useTransform(dragX, [-vw, 0, vw], [0.95, 1, 0.95]);
  const currentOpacity = useTransform(dragX, [-vw, 0, vw], [0.7, 1, 0.7]);

  // Product name reveal opacity on incoming panels
  const nameOpacityLeft = useTransform(dragX, [-vw * 0.3, 0], [1, 0]);
  const nameOpacityRight = useTransform(dragX, [0, vw * 0.3], [0, 1]);

  const handleSwipeComplete = useCallback((newSlug: string, newProduct: Product) => {
    setCurrent({ slug: newSlug, product: newProduct });
  }, []);

  const {
    canSwipe,
    canSwipeLeft,
    canSwipeRight,
    completeSwipe,
    prefetchAdjacent,
    getCachedProduct,
    getAdjacentSlugs,
  } = useSwipeNavigation({ currentSlug: current.slug });

  // Reactively fetch adjacent products — panels render automatically when data arrives
  const { prev: prevSlug, next: nextSlug } = getAdjacentSlugs(current.slug);

  const { data: prevProduct } = useQuery({
    queryKey: productKeys.detail(prevSlug || ''),
    queryFn: ({ signal }) => api.get<Product>(`/products/${prevSlug}`, signal),
    enabled: !!prevSlug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: nextProduct } = useQuery({
    queryKey: productKeys.detail(nextSlug || ''),
    queryFn: ({ signal }) => api.get<Product>(`/products/${nextSlug}`, signal),
    enabled: !!nextSlug,
    staleTime: 5 * 60 * 1000,
  });

  const prevPanel = prevSlug && prevProduct ? { slug: prevSlug, product: prevProduct } : null;
  const nextPanel = nextSlug && nextProduct ? { slug: nextSlug, product: nextProduct } : null;

  // Also prefetch the next-next products for smoother chaining
  useEffect(() => {
    prefetchAdjacent(current.slug);
  }, [current.slug, prefetchAdjacent]);

  // Sync when initialProduct changes (e.g. server-side navigation)
  useEffect(() => {
    if (initialSlug !== current.slug) {
      setCurrent({ slug: initialSlug, product: initialProduct });
      dragX.set(0);
    }
  }, [initialSlug, initialProduct]); // current.slug and dragX are intentionally omitted — we only sync on prop changes

  // Cancel drag on resize/orientation change
  useEffect(() => {
    const handleResize = () => {
      if (isDragging) {
        animate(dragX, 0, SPRING_CONFIG);
        setIsDragging(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDragging, dragX]);

  const onDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      setIsDragging(false);

      if (lockRef.current) {
        animate(dragX, 0, SPRING_CONFIG);
        return;
      }

      const { offset, velocity } = info;
      const goingLeft = offset.x < 0;

      // Can't swipe in this direction
      if ((goingLeft && !canSwipeLeft) || (!goingLeft && !canSwipeRight)) {
        animate(dragX, 0, SPRING_CONFIG);
        return;
      }

      // Single commit decision
      const distance = Math.abs(offset.x);
      const speed = Math.abs(velocity.x);
      const committed = distance > vw * COMMIT_DISTANCE_RATIO || speed > COMMIT_VELOCITY;

      if (!committed) {
        animate(dragX, 0, SPRING_CONFIG);
        return;
      }

      const direction: 'left' | 'right' = goingLeft ? 'left' : 'right';
      const { prev, next } = getAdjacentSlugs(current.slug);
      const targetSlug = direction === 'left' ? next : prev;
      const targetPanel = direction === 'left' ? nextPanel : prevPanel;

      if (!targetSlug || !targetPanel) {
        animate(dragX, 0, SPRING_CONFIG);
        return;
      }

      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate(10);

      // Lock and animate
      lockRef.current = true;
      setIsAnimating(true);

      const targetX = direction === 'left' ? -vw : vw;
      animate(dragX, targetX, {
        ...SPRING_CONFIG,
        onComplete: () => {
          handleSwipeComplete(targetPanel.slug, targetPanel.product);
          completeSwipe(targetPanel.slug, targetPanel.product);
          dragX.set(0);

          // Reset scroll
          if (currentPanelRef.current) {
            currentPanelRef.current.scrollTop = 0;
          }

          setTimeout(() => {
            lockRef.current = false;
            setIsAnimating(false);
          }, LOCK_DURATION);
        },
      });
    },
    [
      canSwipeLeft,
      canSwipeRight,
      current.slug,
      dragX,
      getAdjacentSlugs,
      handleSwipeComplete,
      completeSwipe,
      nextPanel,
      prevPanel,
      vw,
    ]
  );

  // Detect touch-only devices
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Popstate handler for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/products\/(.+)/);
      if (match && match[1] !== current.slug) {
        const slug = match[1];
        const cached = getCachedProduct(slug);
        if (cached) {
          setCurrent({ slug, product: cached });
        } else {
          // Not cached — let browser handle full navigation
          window.location.reload();
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [current.slug, getCachedProduct]);

  // Position transforms for prev/next panels
  const prevX = useTransform(dragX, (v) => -vw + v);
  const nextX = useTransform(dragX, (v) => vw + v);

  if (!canSwipe || !isTouchDevice) {
    return <ProductDetail key={current.slug} product={current.product} />;
  }

  return (
    <div className="relative w-screen overflow-hidden" style={{ height: '100dvh' }}>
      {/* Previous panel (offscreen left) */}
      {prevPanel && (
        <motion.div className="absolute inset-0 overflow-y-auto" style={{ x: prevX }}>
          <ProductDetail key={prevPanel.slug} product={prevPanel.product} isPreview />
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
            style={{ opacity: nameOpacityRight }}
          >
            <p className="text-sm font-bold uppercase tracking-wider text-white drop-shadow-lg">
              {prevPanel.product.name}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Current panel */}
      <motion.div
        ref={currentPanelRef}
        className="absolute inset-0 overflow-y-auto"
        style={{ x: dragX, scale: currentScale, opacity: currentOpacity }}
        drag={canSwipe ? 'x' : false}
        dragSnapToOrigin={false}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={onDragEnd}
      >
        <ProductDetail key={current.slug} product={current.product} />
      </motion.div>

      {/* Next panel (offscreen right) */}
      {nextPanel && (
        <motion.div className="absolute inset-0 overflow-y-auto" style={{ x: nextX }}>
          <ProductDetail key={nextPanel.slug} product={nextPanel.product} isPreview />
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20"
            style={{ opacity: nameOpacityLeft }}
          >
            <p className="text-sm font-bold uppercase tracking-wider text-white drop-shadow-lg">
              {nextPanel.product.name}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Edge peek indicator (right side only, hidden during drag/animation) */}
      {!isDragging && !isAnimating && (
        <EdgePeek product={nextPanel?.product ?? null} side="right" visible={canSwipeLeft} />
      )}
    </div>
  );
}
