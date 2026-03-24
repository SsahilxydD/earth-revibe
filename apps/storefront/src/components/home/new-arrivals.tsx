"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatPrice, truncate, getImageUrl, BLUR_DATA_URL } from "@/lib/utils";
import { SectionHeader } from "./section-header";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images?: { url: string; thumbnailUrl?: string | null; alt?: string }[];
  category?: { name: string } | null;
}

interface NewArrivalsProps {
  products: Product[];
}

function ArrivalCard({ product }: { product: Product }) {
  const primaryImg = product.images?.[0];
  const secondaryImg = product.images?.[1];
  const primaryImage = primaryImg?.url || "/placeholder.png";
  const secondaryImage = secondaryImg?.url;
  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) *
          100,
      )
    : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block flex-shrink-0 w-[160px] sm:w-[200px] md:w-auto"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-[var(--color-surface)]">
        <Image
          src={getImageUrl(primaryImage, 400, primaryImg?.thumbnailUrl)}
          alt={product.name}
          fill
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className={cn(
            "object-cover transition-all duration-500",
            secondaryImage
              ? "group-hover:opacity-0 group-hover:scale-105"
              : "group-hover:scale-105",
          )}
          sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 25vw"
        />
        {secondaryImage && (
          <Image
            src={getImageUrl(secondaryImage, 400, secondaryImg?.thumbnailUrl)}
            alt={`${product.name} - alternate view`}
            fill
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 25vw"
          />
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-[var(--color-sale)] text-white text-[10px] md:text-xs font-semibold px-2 py-0.5 rounded-[var(--badge-radius)]">
            -{discountPercent}%
          </span>
        )}
        <div className="absolute bottom-2 left-2">
          <span className="bg-[var(--color-primary)] text-white text-[9px] md:text-[10px] font-semibold px-2 py-1 rounded-[var(--badge-radius)] uppercase tracking-wider">
            New
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {product.category?.name && (
          <p className="text-[10px] md:text-xs text-[var(--color-muted)] uppercase tracking-wider">
            {product.category.name}
          </p>
        )}
        <h3 className="text-xs md:text-sm font-medium leading-tight">
          {truncate(product.name, 40)}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              hasDiscount && "text-[var(--color-sale)]",
            )}
          >
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[var(--color-muted)] line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function NewArrivals({ products }: NewArrivalsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (!products || products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="px-4 md:px-8 lg:px-12 xl:px-20 py-[var(--section-spacing-mobile)] md:py-[var(--section-spacing-desktop)]"
    >
      <SectionHeader title="Just Dropped" viewAllHref="/categories/new-arrivals" />

      {/* Mobile: horizontal scroll */}
      <div className="relative md:hidden">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-2"
        >
          {products.map((product) => (
            <ArrivalCard key={product.id} product={product} />
          ))}
        </div>
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-1/3 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow-md"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-0 top-1/3 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow-md"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {products.slice(0, 10).map((product) => (
          <ArrivalCard key={product.id} product={product} />
        ))}
      </div>
    </motion.section>
  );
}
