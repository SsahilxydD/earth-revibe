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
/*  Smooth scroll-to-top with eased animation (for swipe transitions) */
/* ------------------------------------------------------------------ */
function smoothScrollToTop(duration = 300): Promise<void> {
  return new Promise((resolve) => {
    const start = window.scrollY;
    if (start === 0) {
      resolve();
      return;
    }
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start * (1 - eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

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
  const transitionBlur = useMotionValue(0);

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
  const currentFilter = useTransform(
    transitionBlur,
    (v) => (v > 0 ? `blur(${v}px)` : "none")
  );

  // Detect mobile + viewport width + track scroll for preview positioning
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

      const targetX = direction === "next" ? -vw : vw;
      const needsScroll = window.scrollY > 0;

      // Run slide-out, scroll-to-top, and blur all in parallel
      const slideOut = animate(dragX, targetX, {
        type: "spring",
        stiffness: 300,
        damping: 35,
        mass: 0.8,
      });

      if (needsScroll) {
        animate(transitionBlur, 6, {
          duration: 0.25,
          ease: "easeOut",
        });
        smoothScrollToTop(280);
      }

      await slideOut;

      // Get the product data
      let product = queryClient.getQueryData<Product>(productKeys.detail(targetSlug));
      if (!product) {
        try {
          product = await api.get<Product>(`/products/${targetSlug}`);
          queryClient.setQueryData(productKeys.detail(targetSlug), product);
        } catch {
          dragX.set(0);
          transitionBlur.set(0);
          setIsLocked(false);
          return;
        }
      }

      // Ensure we're at scroll 0 before swapping content
      window.scrollTo(0, 0);

      flushSync(() => {
        setCurrentSlug(targetSlug);
        setCurrentProduct(product);
      });

      dragX.set(0);
      window.history.replaceState({}, "", `/products/${targetSlug}`);

      animate(transitionBlur, 0, {
        duration: 0.15,
        ease: "easeIn",
      });

      setIsLocked(false);
    },
    [isLocked, vw, queryClient, dragX, transitionBlur]
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
  // Preview panels use absolute positioning + scrollY counter so they:
  //  1. Always appear at the viewport top regardless of page scroll
  //  2. Are clipped to viewport height — no co-scrolling
  //  3. Work reliably even with ancestor transforms/filters
  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* Previous product — pinned to viewport via scrollY offset */}
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
          <ProductDetail product={prevProduct} isPreview />
        </motion.div>
      )}

      {/* Current product — normal flow, scrollable */}
      <motion.div style={{ x: dragX, opacity: currentOpacity, filter: currentFilter }}>
        <ProductDetail key={currentSlug} product={currentProduct} />
      </motion.div>

      {/* Next product — pinned to viewport via scrollY offset */}
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
          <ProductDetail product={nextProduct} isPreview />
        </motion.div>
      )}
    </div>
  );
}
