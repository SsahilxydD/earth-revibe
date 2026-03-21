"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/hooks/use-products";
import { usePrefetchAdjacentProducts } from "@/hooks/use-prefetch-adjacent-products";
import { useProductNavStore } from "@/stores/product-nav-store";
import { ProductDetail } from "./product-detail";
import { api } from "@/lib/api-client";
import type { Product } from "@/types";

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0.8,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0.8,
  }),
};

const slideTransition = {
  duration: 0.35,
  ease: [0.32, 0.72, 0, 1] as const,
};

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
  const [direction, setDirection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Seed the TanStack Query cache with the server-fetched product
  useEffect(() => {
    queryClient.setQueryData(productKeys.detail(initialSlug), initialProduct);
  }, [initialSlug, initialProduct, queryClient]);

  // Prefetch adjacent products
  usePrefetchAdjacentProducts(currentSlug);

  const { prev, next } = getAdjacentSlugs(currentSlug);
  const hasNav = slugs.length > 1;

  const transitionTo = useCallback(
    async (newSlug: string, dir: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setDirection(dir);

      // Try cache first
      let product = queryClient.getQueryData<Product>(productKeys.detail(newSlug));

      if (!product) {
        try {
          product = await api.get<Product>(`/products/${newSlug}`);
          queryClient.setQueryData(productKeys.detail(newSlug), product);
        } catch {
          setIsTransitioning(false);
          return;
        }
      }

      setCurrentSlug(newSlug);
      setCurrentProduct(product);
      window.history.replaceState({}, "", `/products/${newSlug}`);
      window.scrollTo({ top: 0, behavior: "instant" });

      // Small delay to let animation complete before unlocking
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [isTransitioning, queryClient]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      if (isTransitioning) return;

      const threshold = window.innerWidth * 0.25;
      const velocityThreshold = 500;
      const { x: offsetX } = info.offset;
      const { x: velocityX } = info.velocity;

      // Swipe left → next product
      if (
        (offsetX < -threshold || (offsetX < -50 && Math.abs(velocityX) > velocityThreshold)) &&
        next
      ) {
        transitionTo(next, 1);
        return;
      }

      // Swipe right → previous product
      if (
        (offsetX > threshold || (offsetX > 50 && Math.abs(velocityX) > velocityThreshold)) &&
        prev
      ) {
        transitionTo(prev, -1);
        return;
      }
    },
    [isTransitioning, next, prev, transitionTo]
  );

  // Desktop or no nav context → render plain ProductDetail
  if (!isMobile || !hasNav) {
    return <ProductDetail key={currentSlug} product={currentProduct} />;
  }

  // Mobile with nav context → swipeable
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentSlug}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragDirectionLock
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ touchAction: "pan-y" }}
        >
          <ProductDetail key={currentSlug} product={currentProduct} />
        </motion.div>
      </AnimatePresence>

      {/* Edge indicators */}
      {prev && (
        <div className="pointer-events-none fixed left-0 top-1/2 z-30 -translate-y-1/2">
          <div className="h-8 w-[2px] rounded-r bg-black/10" />
        </div>
      )}
      {next && (
        <div className="pointer-events-none fixed right-0 top-1/2 z-30 -translate-y-1/2">
          <div className="h-8 w-[2px] rounded-l bg-black/10" />
        </div>
      )}
    </div>
  );
}
