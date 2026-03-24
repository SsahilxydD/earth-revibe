"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/hooks/use-products";
import { usePrefetchAdjacentProducts } from "@/hooks/use-prefetch-adjacent-products";
import { useProductNavStore } from "@/stores/product-nav-store";
import { ProductDetail } from "./product-detail";
import { api } from "@/lib/api-client";
import type { Product } from "@/types";

/* ------------------------------------------------------------------ */
/*  Zara-style 3-bar loading animation                                 */
/* ------------------------------------------------------------------ */

function ZaraLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        width: "100%",
        background: "#fff",
        gap: "4px",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: "3px",
            height: "20px",
            background: "#121212",
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
/*  Zara-style swipe: three fixed-viewport panels side by side.        */
/*                                                                     */
/*  Each panel is 100vw × 100dvh with overflow-y: auto (its own       */
/*  scroll). The container is position:fixed so it owns the entire     */
/*  screen. Horizontal swiping translates the container; vertical      */
/*  scrolling is handled per-panel. This guarantees:                    */
/*   1. Next product ALWAYS starts at scroll 0 (own scroll container)  */
/*   2. No scroll position leak between products                       */
/*   3. No flash — panels are pre-rendered off-screen                  */
/*   4. No page-level scroll involved at all                           */
/* ------------------------------------------------------------------ */

interface Props {
  initialProduct: Product;
  initialSlug: string;
}

export function SwipeableProductWrapper({ initialProduct, initialSlug }: Props) {
  const queryClient = useQueryClient();
  const allSlugs = useProductNavStore((s) => s.allSlugs);
  const categorySlugs = useProductNavStore((s) => s.slugs);
  const getAdjacentSlugs = useProductNavStore((s) => s.getAdjacentSlugs);

  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [currentProduct, setCurrentProduct] = useState<Product>(initialProduct);
  const [prevProduct, setPrevProduct] = useState<Product | null>(null);
  const [nextProduct, setNextProduct] = useState<Product | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Animation state — managed via refs to avoid re-renders during drag
  const isLockedRef = useRef(false);
  const translateXRef = useRef(0);
  const containerElRef = useRef<HTMLDivElement>(null);
  const currentPanelRef = useRef<HTMLDivElement>(null);

  const touchRef = useRef<{
    startX: number;
    startY: number;
    axis: "x" | "y" | null;
    startTime: number;
  }>({ startX: 0, startY: 0, axis: null, startTime: 0 });

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Seed cache
  useEffect(() => {
    queryClient.setQueryData(productKeys.detail(initialSlug), initialProduct);
  }, [initialSlug, initialProduct, queryClient]);

  // Prefetch adjacent products
  usePrefetchAdjacentProducts(currentSlug);

  const { prev, next } = getAdjacentSlugs(currentSlug);
  const activeList = categorySlugs.length > 1 ? categorySlugs : allSlugs;
  const hasNav = activeList.length > 1;

  // Lock body scroll when swipe mode is active (Zara pattern).
  // The body must not scroll — each panel has its own overflow-y: auto.
  useEffect(() => {
    if (!isMobile || !hasNav) return;

    const html = document.documentElement;
    const body = document.body;

    // Save original values
    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = body.style.overflow;
    const origBodyHeight = body.style.height;
    const origBodyPosition = body.style.position;

    // Lock
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100dvh";
    body.style.position = "fixed";
    body.style.width = "100%";

    return () => {
      html.style.overflow = origHtmlOverflow;
      body.style.overflow = origBodyOverflow;
      body.style.height = origBodyHeight;
      body.style.position = origBodyPosition;
      body.style.width = "";
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

    if (prev) loadProduct(prev).then((p) => { if (!cancelled) setPrevProduct(p); });
    else setPrevProduct(null);

    if (next) loadProduct(next).then((p) => { if (!cancelled) setNextProduct(p); });
    else setNextProduct(null);

    return () => { cancelled = true; };
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

  // --- Swipe helpers ---
  // The track's base position is translateX(-100vw) — centered on the middle panel.
  // Drag offset is ADDED to this base. So 0 = centered, -vw = show next, +vw = show prev.

  const BASE_OFFSET = "-100vw";

  const setTranslateX = useCallback((x: number) => {
    translateXRef.current = x;
    if (containerElRef.current) {
      containerElRef.current.style.transform = `translateX(calc(${BASE_OFFSET} + ${x}px))`;
    }
  }, []);

  const animateTo = useCallback((targetX: number, duration = 280): Promise<void> => {
    return new Promise((resolve) => {
      const el = containerElRef.current;
      if (!el) { resolve(); return; }

      el.style.transition = `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
      el.style.transform = `translateX(calc(${BASE_OFFSET} + ${targetX}px))`;
      translateXRef.current = targetX;

      const onEnd = () => {
        el.removeEventListener("transitionend", onEnd);
        el.style.transition = "none";
        resolve();
      };
      el.addEventListener("transitionend", onEnd);

      // Safety timeout in case transitionend doesn't fire
      setTimeout(() => {
        el.removeEventListener("transitionend", onEnd);
        el.style.transition = "none";
        resolve();
      }, duration + 50);
    });
  }, []);

  // Track whether we need to snap back after React re-renders
  const pendingSnapRef = useRef(false);

  const commitSwipe = useCallback((targetSlug: string, product: Product) => {
    // Reset scroll on current panel to 0 for when it becomes a neighbor later
    if (currentPanelRef.current) {
      currentPanelRef.current.scrollTop = 0;
    }

    // Mark that we need to snap back AFTER React renders the new content.
    // Do NOT snap transform here — the center panel still shows old content.
    // The adjacent panel (which IS the new product) is currently visible at ±100vw.
    // We keep it there until React swaps the center panel content.
    pendingSnapRef.current = true;

    // Swap products — triggers re-render
    setCurrentSlug(targetSlug);
    setCurrentProduct(product);

    // Update URL silently — no page navigation
    window.history.replaceState(
      { ...window.history.state, __N: true },
      "",
      `/products/${targetSlug}`
    );
  }, []);

  // After React commits the new product to the center panel, snap back to center.
  // This runs AFTER the DOM has been updated, so no flash of old content.
  useEffect(() => {
    if (!pendingSnapRef.current) return;
    pendingSnapRef.current = false;

    // Use rAF to ensure the browser has painted the new content
    requestAnimationFrame(() => {
      if (containerElRef.current) {
        containerElRef.current.style.transition = "none";
        containerElRef.current.style.transform = "translateX(-100vw)";
      }
      translateXRef.current = 0;
      isLockedRef.current = false;
    });
  }, [currentSlug]);

  const snapTo = useCallback(
    async (targetSlug: string | null, direction: "prev" | "next") => {
      if (isLockedRef.current || !targetSlug) return;
      isLockedRef.current = true;

      try {
        // Get product from cache or fetch
        let product = queryClient.getQueryData<Product>(productKeys.detail(targetSlug));
        if (!product) {
          // Snap back while we fetch
          await animateTo(0, 200);
          product = await api.get<Product>(`/products/${targetSlug}`);
          queryClient.setQueryData(productKeys.detail(targetSlug), product);
        }

        // Slide to reveal the adjacent panel
        const vw = window.innerWidth;
        const targetX = direction === "next" ? -vw : vw;
        await animateTo(targetX);

        // Commit: swap content. The useEffect on currentSlug will snap back
        // to center AFTER React renders the new product — no flash.
        // isLockedRef is unlocked in that useEffect, not here.
        commitSwipe(targetSlug, product);
      } catch {
        setTranslateX(0);
        isLockedRef.current = false;
      }
    },
    [queryClient, animateTo, commitSwipe, setTranslateX]
  );

  // --- Touch handlers ---

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isLockedRef.current) return;
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, axis: null, startTime: Date.now() };
    // Kill any lingering transition
    if (containerElRef.current) containerElRef.current.style.transition = "none";
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isLockedRef.current) return;
    const t = e.touches[0];
    const ref = touchRef.current;

    const dx = t.clientX - ref.startX;
    const dy = t.clientY - ref.startY;

    // Determine axis lock on first significant movement
    if (ref.axis === null) {
      if (Math.abs(dx) + Math.abs(dy) < 8) return;
      ref.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    // If vertical scroll, don't interfere
    if (ref.axis === "y") return;

    // Horizontal drag — apply rubber-band at edges if no neighbor loaded
    let delta = dx;
    if ((!prevProduct && delta > 0) || (!nextProduct && delta < 0)) {
      delta *= 0.2;
    }

    setTranslateX(delta);
  }, [prevProduct, nextProduct, setTranslateX]);

  const handleTouchEnd = useCallback(() => {
    if (isLockedRef.current) return;
    const ref = touchRef.current;

    if (ref.axis !== "x") {
      // Was a vertical scroll, not a swipe
      setTranslateX(0);
      return;
    }

    const dx = translateXRef.current;
    const vw = window.innerWidth;
    const elapsed = Date.now() - ref.startTime;
    const velocity = Math.abs(dx) / Math.max(elapsed, 1);

    // Swipe threshold: either 20% of screen or fast flick (>0.5px/ms)
    const threshold = vw * 0.2;
    const isFlick = velocity > 0.5;

    if ((dx < -threshold || (dx < 0 && isFlick)) && next) {
      snapTo(next, "next");
    } else if ((dx > threshold || (dx > 0 && isFlick)) && prev) {
      snapTo(prev, "prev");
    } else {
      // Snap back
      animateTo(0, 200);
    }

    touchRef.current.axis = null;
  }, [next, prev, snapTo, animateTo, setTranslateX]);

  // --- Render ---

  // Desktop or no nav → simple render, no swipe
  if (!isMobile || !hasNav) {
    return <ProductDetail key={currentSlug} product={currentProduct} />;
  }

  // Mobile: Zara-style three-panel viewport-locked carousel
  // Outer: overflow:hidden viewport. Inner: flex track that translateX slides.
  // Each panel has its own overflow-y:auto scroll — no shared scroll context.
  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        position: "relative",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding track — three panels side by side */}
      <div
        ref={containerElRef}
        style={{
          display: "flex",
          width: "300vw",
          height: "100dvh",
          transform: "translateX(-100vw)",
          transition: "none",
          willChange: "transform",
        }}
      >
        {/* PREV panel — own scroll container */}
        <div
          style={{
            width: "100vw",
            height: "100dvh",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            flexShrink: 0,
          }}
        >
          {prevProduct ? (
            <ProductDetail product={prevProduct} isPreview />
          ) : (
            <ZaraLoader />
          )}
        </div>

        {/* CURRENT panel — own scroll container */}
        <div
          ref={currentPanelRef}
          style={{
            width: "100vw",
            height: "100dvh",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            flexShrink: 0,
          }}
        >
          <ProductDetail key={currentSlug} product={currentProduct} />
        </div>

        {/* NEXT panel — own scroll container */}
        <div
          style={{
            width: "100vw",
            height: "100dvh",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            flexShrink: 0,
          }}
        >
          {nextProduct ? (
            <ProductDetail product={nextProduct} isPreview />
          ) : (
            <ZaraLoader />
          )}
        </div>
      </div>
    </div>
  );
}
