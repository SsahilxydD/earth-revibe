"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { cn, formatPrice, getImageUrl } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const images = product.images ?? [];

  const primaryImage = useMemo(() => {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    return sorted.find((img) => img.isPrimary) || sorted[0] || null;
  }, [images]);

  const secondaryImage = useMemo(() => {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const primary = sorted.find((img) => img.isPrimary) || sorted[0];
    return sorted.find((img) => img !== primary) || null;
  }, [images]);

  const isOnSale =
    product.compareAtPrice !== null &&
    product.compareAtPrice > product.price;

  const variants = product.variants ?? [];
  const isOutOfStock = variants.length > 0 && variants.every((v) => v.stock <= 0);

  return (
    <div className="group relative">
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f5f5f5]">
          {primaryImage && (
            <Image
              src={getImageUrl(primaryImage.url, 600, primaryImage.thumbnailUrl)}
              alt={primaryImage.altText || product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-opacity duration-500",
                secondaryImage ? "group-hover:opacity-0" : ""
              )}
            />
          )}
          {secondaryImage && (
            <Image
              src={getImageUrl(secondaryImage.url, 600, secondaryImage.thumbnailUrl)}
              alt={secondaryImage.altText || product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="absolute inset-0 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}

          {/* Sold out overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-sold-out)]">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="mt-2 px-0.5">
          <h3 className="line-clamp-2 text-xs leading-snug text-black">
            {product.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-2">
            {isOnSale ? (
              <>
                <span className="text-xs font-medium text-black">
                  {formatPrice(product.price)}
                </span>
                <span className="text-[10px] text-black/40 line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              </>
            ) : (
              <span className="text-xs font-medium text-black">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Wishlist button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsWishlisted((prev) => !prev);
        }}
        className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={14}
          className={cn(
            "transition-colors",
            isWishlisted
              ? "fill-[var(--color-sale)] text-[var(--color-sale)]"
              : "text-black/60"
          )}
        />
      </button>

      {/* Add to cart button */}
      {!isOutOfStock && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/products/${product.slug}`;
          }}
          className="absolute bottom-[3.2rem] right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
          aria-label="Add to cart"
        >
          <Plus size={14} className="text-black/60" />
        </button>
      )}
    </div>
  );
}
