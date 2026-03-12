"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import { useRelatedProducts } from "@/hooks/use-products";

interface RelatedProductsProps {
  categorySlug: string | undefined;
  excludeProductId: string;
}

export function RelatedProducts({ categorySlug, excludeProductId }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data } = useRelatedProducts(categorySlug, excludeProductId);

  const products = data?.products || [];

  if (products.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          You May Also Like
        </h2>
        <div className="hidden gap-2 md:flex">
          <button
            onClick={() => scroll("left")}
            className="flex h-9 w-9 items-center justify-center border border-[var(--color-border)] transition-colors hover:border-[var(--color-text)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-9 w-9 items-center justify-center border border-[var(--color-border)] transition-colors hover:border-[var(--color-text)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="hide-scrollbar -mx-1 flex gap-1 overflow-x-auto scroll-smooth md:gap-4"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[48%] shrink-0 px-0.5 md:w-[32%] lg:w-[24%]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
