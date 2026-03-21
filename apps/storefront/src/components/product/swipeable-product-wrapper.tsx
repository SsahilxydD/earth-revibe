"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  // Track touch direction to avoid conflict with vertical scroll
  const touchStartRef = useRef<{ x: number; y: number; locked: boolean | null }>({
    x: 0, y: 0, locked: null,
  });

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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

  // Scale transform for the panels behind — subtle zoom effect like a gallery
  const prevScale = useTransform(dragX, [-300, 0, 300], [1, 0.92, 0.92]);
  const nextScale = useTransform(dragX, [-300, 0, 300], [0.92, 0.92, 1]);
  const currentOpacity = useTransform(
    dragX,
    [-200, -100, 0, 100, 200],
    [0.6, 0.85, 1, 0.85, 0.6]
  );

  const snapTo = useCallback(
    async (targetSlug: string | null, direction: "prev" | "next") => {
      if (isLocked || !targetSlug) return;
      setIsLocked(true);

      const vw = window.innerWidth;
      const targetX = direction === "next" ? -vw : vw;

      // Animate the slide out
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

      // Update state
      setCurrentSlug(targetSlug);
      setCurrentProduct(product);
      window.history.replaceState({}, "", `/products/${targetSlug}`);
      window.scrollTo({ top: 0, behavior: "instant" });

      // Reset position instantly (product already swapped)
      dragX.set(0);
      setIsLocked(false);
    },
    [isLocked, queryClient, dragX]
  );

  const snapBack = useCallback(() => {
    animate(dragX, 0, {
      type: "spring",
      stiffness: 400,
      damping: 30,
    });
  }, [dragX]);

  // Touch handlers for direction locking (prevent hijacking vertical scroll)
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
        if (dx + dy < 10) return; // not enough movement to determine direction
        ref.locked = dx > dy; // true = horizontal, false = vertical
      }

      if (ref.locked) {
        // Horizontal swipe — update drag position
        let delta = touch.clientX - ref.x;

        // Apply resistance at boundaries
        if ((!prev && delta > 0) || (!next && delta < 0)) {
          delta *= 0.15; // strong rubber-band resistance
        }

        dragX.set(delta);
      }
      // If vertical, do nothing — let browser scroll naturally
    },
    [isLocked, prev, next, dragX]
  );

  const handleTouchEnd = useCallback(() => {
    if (isLocked) return;
    const ref = touchStartRef.current;

    if (!ref.locked) {
      // Was a tap or vertical scroll — reset
      snapBack();
      return;
    }

    const currentX = dragX.get();
    const vw = window.innerWidth;
    const threshold = vw * 0.2; // 20% of screen width

    if (currentX < -threshold && next) {
      snapTo(next, "next");
    } else if (currentX > threshold && prev) {
      snapTo(prev, "prev");
    } else {
      snapBack();
    }

    touchStartRef.current.locked = null;
  }, [isLocked, dragX, next, prev, snapTo, snapBack]);

  // Desktop or no nav context → plain render
  if (!isMobile || !hasNav) {
    return <ProductDetail key={currentSlug} product={currentProduct} />;
  }

  // Mobile with nav context → three-panel swipeable layout
  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* Previous product (off-screen left) */}
      {prevProduct && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            x: useTransform(dragX, (v) => v - window.innerWidth),
            scale: prevScale,
          }}
        >
          <ProductDetail product={prevProduct} />
        </motion.div>
      )}

      {/* Current product */}
      <motion.div
        style={{
          x: dragX,
          opacity: currentOpacity,
        }}
      >
        <ProductDetail key={currentSlug} product={currentProduct} />
      </motion.div>

      {/* Next product (off-screen right) */}
      {nextProduct && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            x: useTransform(dragX, (v) => v + window.innerWidth),
            scale: nextScale,
          }}
        >
          <ProductDetail product={nextProduct} />
        </motion.div>
      )}
    </div>
  );
}
