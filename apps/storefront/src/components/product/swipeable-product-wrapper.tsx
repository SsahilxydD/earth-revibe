'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { productKeys } from '@/hooks/use-products';
import { usePrefetchAdjacentProducts } from '@/hooks/use-prefetch-adjacent-products';
import { useProductNavStore } from '@/stores/product-nav-store';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import { ProductDetail } from './product-detail';
import { api } from '@/lib/api-client';
import { cn, formatPrice } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';

/* ------------------------------------------------------------------ */
/*  Zara-style 3-bar loading animation                                 */
/* ------------------------------------------------------------------ */

function ZaraLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        width: '100%',
        background: '#fff',
        gap: '4px',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: '20px',
            background: '#121212',
            animation: `zaraBarFill 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes zaraBarFill {
          0%, 80%, 100% { transform: scaleY(0.4); opacity: 0.3; }
          40% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Persistent mobile dock — lives in the swipe wrapper, never         */
/*  unmounts. Only its CONTENTS update when the product changes.        */
/* ------------------------------------------------------------------ */

function PersistentDock({ product, visible }: { product: Product; visible: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [showSizeSheet, setShowSizeSheet] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();

  const variants = product.variants;
  const sizes = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of variants) {
      if (v.size && !seen.has(v.size)) {
        seen.add(v.size);
        result.push(v.size);
      }
    }
    return result;
  }, [variants]);

  const colors = useMemo(() => {
    const seen = new Map<string, string | null>();
    for (const v of variants) {
      if (v.color && !seen.has(v.color)) {
        seen.set(v.color, v.colorHex);
      }
    }
    return Array.from(seen.entries()).map(([name, hex]) => ({ name, hex: hex || '#ccc' }));
  }, [variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.length > 0 ? colors[0].name : null
  );

  // Reset selected color when product changes
  useEffect(() => {
    setSelectedColor(colors.length > 0 ? colors[0].name : null);
  }, [product.id, colors]);

  const displayPrice = product.price;
  const isOnSale = product.compareAtPrice !== null && product.compareAtPrice > displayPrice;

  const getVariantStock = (color: string | null, size: string | null): number => {
    const match = variants.find(
      (v: ProductVariant) =>
        (color === null || v.color === color) && (size === null || v.size === size)
    );
    return match?.stock ?? 0;
  };

  const handleMobileAddToCart = () => {
    if (sizes.length > 0) {
      setShowSizeSheet(true);
      return;
    }
    doAddToCart(null);
  };

  const doAddToCart = (size: string | null) => {
    setIsAdding(true);

    const variant = variants.find(
      (v: ProductVariant) =>
        (selectedColor === null || v.color === selectedColor) && (size === null || v.size === size)
    );

    const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
    addItem({
      id: variant?.id || product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url || '',
      price: variant?.price ?? product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
      size: size || '',
      color: selectedColor || '',
      maxQuantity: variant?.stock ?? 99,
      quantity: 1,
    });

    addToast('Added to cart', 'success');
    setIsAdding(false);
    setShowSizeSheet(false);
  };

  return (
    <>
      {/* Dock — always mounted, collapses with fade-down when "You May Also Like" is in view */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="dock"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="px-4 pt-3">
              <p className="text-sm font-semibold uppercase tracking-wide truncate">
                {product.name}
              </p>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-sm', isOnSale && 'text-[var(--color-sale)]')}>
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && (
                  <span className="text-xs text-[var(--color-muted)] line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                MRP incl. of all taxes
              </p>
            </div>

            {/* Color swatches — only when multiple colors exist */}
            {colors.length > 1 && (
              <div className="flex items-center gap-2 px-4 pt-1">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-all',
                      selectedColor === c.name
                        ? 'border-[var(--color-primary)] scale-110'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: c.hex }}
                    aria-label={c.name}
                  />
                ))}
              </div>
            )}

            <div className="px-4 py-3">
              <button
                type="button"
                onClick={handleMobileAddToCart}
                disabled={isAdding}
                className="flex h-12 w-full items-center justify-center border text-sm font-bold uppercase tracking-[0.2em] transition-colors border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
              >
                {isAdding ? <Loader2 size={16} className="animate-spin" /> : 'ADD'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Size selection sheet */}
      <div
        className={`fixed inset-0 z-[70] bg-black transition-opacity duration-300 ${
          showSizeSheet ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowSizeSheet(false)}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[71] bg-white transition-transform duration-300 ease-out ${
          showSizeSheet ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="sticky top-0 z-10 bg-white pt-5 pb-3 flex justify-center">
          <div className="w-10 h-[3px] rounded-full bg-[#d0d0d0]" />
        </div>
        <div className="px-6 pb-8">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-center text-[var(--color-text)]">
            Select Size
          </h3>
          <div className="mt-6 flex flex-col">
            {sizes.map((size) => {
              const stock = getVariantStock(selectedColor, size);
              const isOutOfStock = stock <= 0;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    if (!isOutOfStock) doAddToCart(size);
                  }}
                  disabled={isOutOfStock}
                  className={cn(
                    'py-4 text-center text-sm uppercase tracking-wider border-b border-[var(--color-border)]/10 transition-colors',
                    isOutOfStock
                      ? 'text-[var(--color-sold-out)] cursor-not-allowed'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Haptic feedback helper                                              */
/* ------------------------------------------------------------------ */

function haptic(ms = 10) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    // Vibration API not available — silent fail
  }
}

/* ------------------------------------------------------------------ */
/*  Zara-style swipe: three fixed-viewport panels side by side.        */
/*                                                                     */
/*  ARCHITECTURE (native-app parity):                                  */
/*   1. Three panels: prev | current | next, each 100vw × 100dvh      */
/*   2. Each panel has its own overflow-y:auto (no scroll leaking)     */
/*   3. Swipe commit uses flushSync — zero-frame blink                 */
/*   4. Dock is persistent — rendered ONCE outside the panels          */
/*   5. Haptic feedback on swipe commit                                */
/*   6. touch-action: pan-y eliminates browser gesture conflicts       */
/*   7. overscroll-behavior: contain prevents iOS page bounce          */
/*   8. Velocity-matched animation — fast flick = fast snap            */
/* ------------------------------------------------------------------ */

interface Props {
  initialProduct: Product;
  initialSlug: string;
}

export function SwipeableProductWrapper({ initialProduct, initialSlug }: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const allSlugs = useProductNavStore((s) => s.allSlugs);
  const categorySlugs = useProductNavStore((s) => s.slugs);
  const getAdjacentSlugs = useProductNavStore((s) => s.getAdjacentSlugs);

  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [currentProduct, setCurrentProduct] = useState<Product>(initialProduct);
  const [prevProduct, setPrevProduct] = useState<Product | null>(null);
  const [nextProduct, setNextProduct] = useState<Product | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dockVisible, setDockVisible] = useState(true);

  // Animation state — managed via refs to avoid re-renders during drag
  const isLockedRef = useRef(false);
  const translateXRef = useRef(0);
  const containerElRef = useRef<HTMLDivElement>(null);
  const currentPanelRef = useRef<HTMLDivElement>(null);

  const touchRef = useRef<{
    startX: number;
    startY: number;
    axis: 'x' | 'y' | null;
    startTime: number;
  }>({ startX: 0, startY: 0, axis: null, startTime: 0 });

  // Detect mobile + mount
  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync when navigating to a different product via client-side routing
  useEffect(() => {
    if (initialSlug !== currentSlug) {
      setCurrentSlug(initialSlug);
      setCurrentProduct(initialProduct);
      setDockVisible(true);
      // Scroll to top — both window (non-swipe) and current panel (swipe)
      window.scrollTo(0, 0);
      if (currentPanelRef.current) currentPanelRef.current.scrollTop = 0;
    }
    // Seed cache
    queryClient.setQueryData(productKeys.detail(initialSlug), initialProduct);
  }, [initialSlug, initialProduct, queryClient]);

  // Prefetch adjacent products
  usePrefetchAdjacentProducts(currentSlug);

  const { prev, next } = getAdjacentSlugs(currentSlug);
  const activeList = categorySlugs.length > 1 ? categorySlugs : allSlugs;
  const hasNav = activeList.length > 1;

  // Lock body scroll when swipe mode is active (Zara pattern).
  useEffect(() => {
    if (!isMobile || !hasNav) return;

    const html = document.documentElement;
    const body = document.body;

    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = body.style.overflow;
    const origBodyHeight = body.style.height;
    const origBodyPosition = body.style.position;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.height = '100dvh';
    body.style.position = 'fixed';
    body.style.width = '100%';

    return () => {
      html.style.overflow = origHtmlOverflow;
      body.style.overflow = origBodyOverflow;
      body.style.height = origBodyHeight;
      body.style.position = origBodyPosition;
      body.style.width = '';
    };
  }, [isMobile, hasNav]);

  // Load adjacent products
  useEffect(() => {
    let cancelled = false;

    const loadProduct = async (slug: string): Promise<Product | null> => {
      const cached = queryClient.getQueryData<Product>(productKeys.detail(slug));
      if (cached) return cached;
      try {
        const product = await api.get<Product>(`/products/${slug}`);
        if (!cancelled) queryClient.setQueryData(productKeys.detail(slug), product);
        return product;
      } catch {
        return null;
      }
    };

    if (prev)
      loadProduct(prev).then((p) => {
        if (!cancelled) setPrevProduct(p);
      });
    else setPrevProduct(null);

    if (next)
      loadProduct(next).then((p) => {
        if (!cancelled) setNextProduct(p);
      });
    else setNextProduct(null);

    return () => {
      cancelled = true;
    };
  }, [prev, next, queryClient, currentSlug]);

  // Preload adjacent images
  useEffect(() => {
    const preload = (product: Product | null) => {
      if (!product) return;
      product.images.forEach((img) => {
        const i = new window.Image();
        i.src = img.url;
      });
    };
    preload(prevProduct);
    preload(nextProduct);
  }, [prevProduct, nextProduct]);

  // Hide dock when user scrolls to the [data-dock-hide] sentinel.
  // Uses getBoundingClientRect — works regardless of DOM nesting, transforms,
  // or offsetParent chain. Compares sentinel's viewport Y to the panel's
  // bottom edge in viewport coords.
  // Ref for cached sentinel — invalidated on slug change via the separate effect below
  const cachedSentinelRef = useRef<Element | null>(null);

  // Reset dock + sentinel cache when product changes (currentSlug drives this)
  useEffect(() => {
    setDockVisible(true);
    cachedSentinelRef.current = null;
  }, [currentSlug]);

  // Attach scroll listener ONCE when the panel is available (panel never unmounts)
  useEffect(() => {
    if (!isMobile || !hasNav) return;
    const panel = currentPanelRef.current;
    if (!panel) return;

    const handleScroll = () => {
      if (!cachedSentinelRef.current) {
        cachedSentinelRef.current = panel.querySelector('[data-dock-hide]');
      }
      if (!cachedSentinelRef.current) return;

      const sentinelTop = cachedSentinelRef.current.getBoundingClientRect().top;
      const panelBottom = panel.getBoundingClientRect().bottom;
      setDockVisible(sentinelTop > panelBottom);
    };

    panel.addEventListener('scroll', handleScroll, { passive: true });
    return () => panel.removeEventListener('scroll', handleScroll);
  }, [isMobile, hasNav]);

  // --- Swipe helpers ---
  const BASE_OFFSET = '-100vw';

  const setTranslateX = useCallback((x: number) => {
    translateXRef.current = x;
    if (containerElRef.current) {
      containerElRef.current.style.transform = `translateX(calc(${BASE_OFFSET} + ${x}px))`;
    }
  }, []);

  // [FIX 7] Velocity-matched animation — duration scales with remaining distance & finger speed
  const animateTo = useCallback(
    (targetX: number, opts?: { duration?: number; velocity?: number }): Promise<void> => {
      return new Promise((resolve) => {
        const el = containerElRef.current;
        if (!el) {
          resolve();
          return;
        }

        const currentX = translateXRef.current;
        const distance = Math.abs(targetX - currentX);
        let duration = opts?.duration ?? 280;

        // If we have velocity from the finger, match the animation speed
        if (opts?.velocity && opts.velocity > 0) {
          // Calculate duration based on remaining distance / velocity
          // Clamp between 120ms (fast flick) and 350ms (slow drag)
          const velocityDuration = distance / opts.velocity;
          duration = Math.max(120, Math.min(350, velocityDuration));
        }

        el.style.transition = `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
        el.style.transform = `translateX(calc(${BASE_OFFSET} + ${targetX}px))`;
        translateXRef.current = targetX;

        const onEnd = () => {
          el.removeEventListener('transitionend', onEnd);
          el.style.transition = 'none';
          resolve();
        };
        el.addEventListener('transitionend', onEnd);

        setTimeout(() => {
          el.removeEventListener('transitionend', onEnd);
          el.style.transition = 'none';
          resolve();
        }, duration + 50);
      });
    },
    []
  );

  // [FIX 1] Blink-free commit using flushSync — state update + transform reset
  // happen in the same synchronous batch, so the browser never paints an
  // intermediate frame where the center panel has new content at the wrong position.
  const commitSwipe = useCallback((targetSlug: string, product: Product) => {
    if (currentPanelRef.current) {
      currentPanelRef.current.scrollTop = 0;
    }

    // flushSync forces React to commit the DOM update synchronously.
    // We then immediately reset the transform — same JS task, zero paint frames in between.
    flushSync(() => {
      setCurrentSlug(targetSlug);
      setCurrentProduct(product);
    });

    // Now the center panel has the new product content. Reset transform to center.
    if (containerElRef.current) {
      containerElRef.current.style.transition = 'none';
      containerElRef.current.style.transform = 'translateX(-100vw)';
    }
    translateXRef.current = 0;
    isLockedRef.current = false;

    // Update URL silently — no page navigation
    // Use replaceState with null state — don't spread Next.js internals (__N etc.)
    // which can corrupt the router's history tracking.
    window.history.replaceState(null, '', `/products/${targetSlug}`);
  }, []);

  const snapTo = useCallback(
    async (targetSlug: string | null, direction: 'prev' | 'next', velocity?: number) => {
      if (isLockedRef.current || !targetSlug) return;
      isLockedRef.current = true;

      try {
        let product = queryClient.getQueryData<Product>(productKeys.detail(targetSlug));
        if (!product) {
          await animateTo(0, { duration: 200 });
          product = await api.get<Product>(`/products/${targetSlug}`);
          queryClient.setQueryData(productKeys.detail(targetSlug), product);
        }

        // [FIX 3] Haptic feedback on swipe commit
        haptic(10);

        // Slide to reveal the adjacent panel
        const vw = window.innerWidth;
        const targetX = direction === 'next' ? -vw : vw;
        await animateTo(targetX, { velocity });

        // Blink-free commit via flushSync
        commitSwipe(targetSlug, product);
      } catch {
        setTranslateX(0);
        isLockedRef.current = false;
        addToast('Couldn\u2019t load product. Please try again.', 'error');
      }
    },
    [queryClient, animateTo, commitSwipe, setTranslateX, addToast]
  );

  // --- Touch handlers ---

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isLockedRef.current) return;
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, axis: null, startTime: Date.now() };
    if (containerElRef.current) containerElRef.current.style.transition = 'none';
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isLockedRef.current) return;
      const t = e.touches[0];
      const ref = touchRef.current;

      const dx = t.clientX - ref.startX;
      const dy = t.clientY - ref.startY;

      if (ref.axis === null) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        ref.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }

      if (ref.axis === 'y') return;

      let delta = dx;
      if ((!prevProduct && delta > 0) || (!nextProduct && delta < 0)) {
        delta *= 0.2;
      }

      setTranslateX(delta);
    },
    [prevProduct, nextProduct, setTranslateX]
  );

  const handleTouchEnd = useCallback(() => {
    if (isLockedRef.current) return;
    const ref = touchRef.current;

    if (ref.axis !== 'x') {
      setTranslateX(0);
      return;
    }

    const dx = translateXRef.current;
    const vw = window.innerWidth;
    const elapsed = Date.now() - ref.startTime;
    // [FIX 7] Capture velocity for animation matching
    const velocity = Math.abs(dx) / Math.max(elapsed, 1); // px/ms

    const threshold = vw * 0.2;
    const isFlick = velocity > 0.5;

    if ((dx < -threshold || (dx < 0 && isFlick)) && next) {
      snapTo(next, 'next', velocity);
    } else if ((dx > threshold || (dx > 0 && isFlick)) && prev) {
      snapTo(prev, 'prev', velocity);
    } else {
      animateTo(0, { duration: 200 });
    }

    touchRef.current.axis = null;
  }, [next, prev, snapTo, animateTo, setTranslateX]);

  // --- Render ---

  // Desktop or no nav → simple render, no swipe
  if (!isMobile || !hasNav) {
    return <ProductDetail key={currentSlug} product={currentProduct} />;
  }

  // Shared panel style
  // position: relative is CRITICAL — makes offsetTop of children relative to the panel,
  // which is needed for the dock-hide sentinel scroll comparison.
  const panelStyle: React.CSSProperties = {
    width: '100vw',
    height: '100dvh',
    overflowY: 'auto',
    overflowX: 'hidden',
    flexShrink: 0,
    overscrollBehavior: 'contain',
    position: 'relative',
    backgroundColor: '#fff',
    // iOS: extend background past the scroll boundary to cover rubber-band overscroll
    WebkitOverflowScrolling: 'touch',
  };

  return (
    <>
      <div
        style={{
          height: '100dvh',
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'pan-y', // [FIX 6] Tell browser: "I handle horizontal, you handle vertical"
          backgroundColor: '#fff', // Prevent iOS overscroll white flash
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding track — three panels side by side */}
        <div
          ref={containerElRef}
          style={{
            display: 'flex',
            width: '300vw',
            height: '100dvh',
            transform: 'translateX(-100vw)',
            transition: 'none',
            willChange: 'transform',
          }}
        >
          {/* PREV panel */}
          <div style={panelStyle}>
            {prevProduct ? <ProductDetail product={prevProduct} isPreview /> : <ZaraLoader />}
          </div>

          {/* CURRENT panel */}
          <div ref={currentPanelRef} style={panelStyle}>
            <ProductDetail key={currentSlug} product={currentProduct} isPreview />
          </div>

          {/* NEXT panel */}
          <div style={panelStyle}>
            {nextProduct ? <ProductDetail product={nextProduct} isPreview /> : <ZaraLoader />}
          </div>
        </div>
      </div>

      {/* [FIX 2] Persistent dock — portaled to body, never unmounts.
          Only its content props change when currentProduct updates.
          Collapses with fade-down when "You May Also Like" is in view. */}
      {mounted &&
        createPortal(
          <PersistentDock product={currentProduct} visible={dockVisible} />,
          document.body
        )}
    </>
  );
}
