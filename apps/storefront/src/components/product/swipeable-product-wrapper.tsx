"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/hooks/use-products";
import { usePrefetchAdjacentProducts } from "@/hooks/use-prefetch-adjacent-products";
import { useProductNavStore } from "@/stores/product-nav-store";
import { ProductDetail } from "./product-detail";
import { api } from "@/lib/api-client";
import type { Product } from "@/types";

/* ------------------------------------------------------------------ */
/*  Scroll position persistence via localStorage                       */
/* ------------------------------------------------------------------ */
const SCROLL_STORAGE_KEY = "er-product-scroll";

function getScrollPositions(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SCROLL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveScrollPosition(slug: string, y: number) {
  try {
    const positions = getScrollPositions();
    positions[slug] = y;
    // Keep only last 50 entries to prevent unbounded growth
    const keys = Object.keys(positions);
    if (keys.length > 50) {
      const oldest = keys.slice(0, keys.length - 50);
      oldest.forEach((k) => delete positions[k]);
    }
    localStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function getSavedScrollPosition(slug: string): number {
  return getScrollPositions()[slug] || 0;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  initialProduct: Product;
  initialSlug: string;
}

export function SwipeableProductWrapper({ initialProduct, initialSlug }: Props) {
  const queryClient = useQueryClient();
  const slugs = useProductNavStore((s) => s.slugs);
  const getAdjacentSlugs = useProductNavStore((s) => s.getAdjacentSlugs);

  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [currentProduct, setCurrentProduct] = useState<Product>(initialProduct);
  const [prevProduct, setPrevProduct] = useState<Product | null>(null);
  const [nextProduct, setNextProduct] = useState<Product | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [vw, setVw] = useState(390);
  const [scrollY, setScrollY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  const touchStartRef = useRef<{ x: number; y: number; locked: boolean | null }>({
    x: 0, y: 0, locked: null,
  });

  // All useTransform calls at top level (never conditional)
  const prevPanelX = useTransform(dragX, (v) => v - vw);
  const nextPanelX = useTransform(dragX, (v) => v + vw);
  const currentOpacity = useTransform(
    dragX,
    [-200, -100, 0, 100, 200],
    [0.7, 0.9, 1, 0.9, 0.7]
  );

  // Detect mobile + viewport width + track scroll
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024);
      setVw(window.innerWidth);
    };
    const trackScroll = () => setScrollY(window.scrollY);
    check();
    trackScroll();
    window.addEventListener("resize", check);
    window.addEventListener("scroll", trackScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("scroll", trackScroll);
    };
  }, []);

  // Restore scroll position when arriving on a product
  useEffect(() => {
    const savedY = getSavedScrollPosition(currentSlug);
    if (savedY > 0) {
      // Small delay to let the DOM render the full product content first
      requestAnimationFrame(() => {
        window.scrollTo(0, savedY);
      });
    }
  }, [currentSlug]);

  // Continuously save scroll position for the current product
  useEffect(() => {
    let ticking = false;
    const save = () => {
      saveScrollPosition(currentSlug, window.scrollY);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(save);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [currentSlug]);

  // Seed cache with initial product
  useEffect(() => {
    queryClient.setQueryData(productKeys.detail(initialSlug), initialProduct);
  }, [initialSlug, initialProduct, queryClient]);

  // Prefetch adjacent products
  usePrefetchAdjacentProducts(currentSlug);

  const { prev, next } = getAdjacentSlugs(currentSlug);
  const hasNav = slugs.length > 1;

  // Load adjacent products into state for rendering
  useEffect(() => {
    if (prev) {
      const cached = queryClient.getQueryData<Product>(productKeys.detail(prev));
      setPrevProduct(cached || null);
      if (!cached) {
        api.get<Product>(`/products/${prev}`).then((p) => {
          queryClient.setQueryData(productKeys.detail(prev), p);
          setPrevProduct(p);
        }).catch(() => {});
      }
    } else {
      setPrevProduct(null);
    }

    if (next) {
      const cached = queryClient.getQueryData<Product>(productKeys.detail(next));
      setNextProduct(cached || null);
      if (!cached) {
        api.get<Product>(`/products/${next}`).then((p) => {
          queryClient.setQueryData(productKeys.detail(next), p);
          setNextProduct(p);
        }).catch(() => {});
      }
    } else {
      setNextProduct(null);
    }
  }, [prev, next, queryClient, currentSlug]);

  const snapTo = useCallback(
    async (targetSlug: string | null, direction: "prev" | "next") => {
      if (isLocked || !targetSlug) return;
      setIsLocked(true);

      // Save current scroll position before leaving
      saveScrollPosition(currentSlug, window.scrollY);

      const targetX = direction === "next" ? -vw : vw;

      // Slide out
      await animate(dragX, targetX, {
        type: "spring",
        stiffness: 300,
        damping: 35,
        mass: 0.8,
      });

      // Get the product data
      let product = queryClient.getQueryData<Product>(productKeys.detail(targetSlug));
      if (!product) {
        try {
          product = await api.get<Product>(`/products/${targetSlug}`);
          queryClient.setQueryData(productKeys.detail(targetSlug), product);
        } catch {
          dragX.set(0);
          setIsLocked(false);
          return;
        }
      }

      // Restore saved scroll position for the target product (or 0)
      const targetScrollY = getSavedScrollPosition(targetSlug);
      window.scrollTo(0, targetScrollY);

      // Swap product state synchronously
      flushSync(() => {
        setCurrentSlug(targetSlug);
        setCurrentProduct(product);
      });

      // Reset position — new content is already in DOM
      dragX.set(0);
      window.history.replaceState({}, "", `/products/${targetSlug}`);

      // Ensure scroll is at the right spot after React re-render
      requestAnimationFrame(() => {
        window.scrollTo(0, targetScrollY);
      });

      setIsLocked(false);
    },
    [isLocked, vw, queryClient, dragX, currentSlug]
  );

  const snapBack = useCallback(() => {
    animate(dragX, 0, {
      type: "spring",
      stiffness: 400,
      damping: 30,
    });
  }, [dragX]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, locked: null };
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isLocked) return;
      const touch = e.touches[0];
      const ref = touchStartRef.current;

      if (ref.locked === null) {
        const dx = Math.abs(touch.clientX - ref.x);
        const dy = Math.abs(touch.clientY - ref.y);
        if (dx + dy < 10) return;
        ref.locked = dx > dy;
      }

      if (ref.locked) {
        let delta = touch.clientX - ref.x;

        // Rubber-band resistance at boundaries
        if ((!prev && delta > 0) || (!next && delta < 0)) {
          delta *= 0.15;
        }

        dragX.set(delta);
      }
    },
    [isLocked, prev, next, dragX]
  );

  const handleTouchEnd = useCallback(() => {
    if (isLocked) return;
    const ref = touchStartRef.current;

    if (!ref.locked) {
      snapBack();
      return;
    }

    const currentX = dragX.get();
    const threshold = vw * 0.2;

    if (currentX < -threshold && next) {
      snapTo(next, "next");
    } else if (currentX > threshold && prev) {
      snapTo(prev, "prev");
    } else {
      snapBack();
    }

    touchStartRef.current.locked = null;
  }, [isLocked, dragX, vw, next, prev, snapTo, snapBack]);

  // Preload adjacent product images into browser cache
  useEffect(() => {
    const preloadImages = (product: Product | null) => {
      if (!product) return;
      product.images.forEach((img) => {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = img.url;
        if (!document.querySelector(`link[href="${img.url}"]`)) {
          document.head.appendChild(link);
        }
      });
    };
    preloadImages(prevProduct);
    preloadImages(nextProduct);
  }, [prevProduct, nextProduct]);

  // Desktop or no nav context → plain render
  if (!isMobile || !hasNav) {
    return <ProductDetail key={currentSlug} product={currentProduct} />;
  }

  // Mobile with nav context → three-panel swipeable layout
  // Preview panels use saved scroll positions from localStorage
  const prevSavedScroll = prev ? getSavedScrollPosition(prev) : 0;
  const nextSavedScroll = next ? getSavedScrollPosition(next) : 0;

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* Previous product — shows at its saved scroll position */}
      {prevProduct && (
        <motion.div
          className="absolute left-0 w-full overflow-hidden pointer-events-none"
          style={{
            x: prevPanelX,
            top: scrollY,
            height: "100vh",
            zIndex: 20,
          }}
        >
          <div style={{ marginTop: -prevSavedScroll }}>
            <ProductDetail product={prevProduct} isPreview />
          </div>
        </motion.div>
      )}

      {/* Current product — normal flow, scrollable */}
      <motion.div style={{ x: dragX, opacity: currentOpacity }}>
        <ProductDetail key={currentSlug} product={currentProduct} />
      </motion.div>

      {/* Next product — shows at its saved scroll position */}
      {nextProduct && (
        <motion.div
          className="absolute left-0 w-full overflow-hidden pointer-events-none"
          style={{
            x: nextPanelX,
            top: scrollY,
            height: "100vh",
            zIndex: 20,
          }}
        >
          <div style={{ marginTop: -nextSavedScroll }}>
            <ProductDetail product={nextProduct} isPreview />
          </div>
        </motion.div>
      )}
    </div>
  );
}
