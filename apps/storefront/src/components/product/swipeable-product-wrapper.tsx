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

  // Detect mobile + viewport width
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024);
      setVw(window.innerWidth);
    };
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

  const snapTo = useCallback(
    async (targetSlug: string | null, direction: "prev" | "next") => {
      if (isLocked || !targetSlug) return;
      setIsLocked(true);

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

      // Swap product state synchronously so React re-renders BEFORE
      // we reset dragX — this eliminates the 1-frame blink where the
      // old product would flash at position 0.
      flushSync(() => {
        setCurrentSlug(targetSlug);
        setCurrentProduct(product);
      });

      // Now React has already rendered the new product at dragX position.
      // Reset position — new content is already in DOM, no visible change.
      dragX.set(0);
      window.history.replaceState({}, "", `/products/${targetSlug}`);
      window.scrollTo({ top: 0, behavior: "instant" });
      setIsLocked(false);
    },
    [isLocked, vw, queryClient, dragX]
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
        // Avoid duplicates
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
  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* Previous product (off-screen left, no fixed dock) */}
      {prevProduct && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ x: prevPanelX }}
        >
          <ProductDetail product={prevProduct} isPreview />
        </motion.div>
      )}

      {/* Current product (with dock) */}
      <motion.div style={{ x: dragX, opacity: currentOpacity }}>
        <ProductDetail key={currentSlug} product={currentProduct} />
      </motion.div>

      {/* Next product (off-screen right, no fixed dock) */}
      {nextProduct && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ x: nextPanelX }}
        >
          <ProductDetail product={nextProduct} isPreview />
        </motion.div>
      )}
    </div>
  );
}
