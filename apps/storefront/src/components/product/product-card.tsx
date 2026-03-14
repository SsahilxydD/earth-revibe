"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { cn, formatPrice, getImageUrl } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);

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

  const discountPercent = isOnSale
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;

  const isNew = useMemo(() => {
    if (!product.createdAt) return false;
    const created = new Date(product.createdAt);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return created >= fourteenDaysAgo;
  }, [product.createdAt]);

  const variants = product.variants ?? [];

  const colorVariants = useMemo(() => {
    const seen = new Set<string>();
    return variants.filter((v) => {
      if (!v.color || !v.colorHex || seen.has(v.color)) return false;
      seen.add(v.color);
      return true;
    });
  }, [variants]);

  const isOutOfStock = variants.length > 0 && variants.every((v) => v.stock <= 0);

  return (
    <div className="group relative">
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image container */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-white">
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

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {isOnSale && (
              <span className="rounded-[var(--badge-radius)] bg-[var(--color-sale)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {discountPercent > 0 ? `-${discountPercent}%` : "SALE"}
              </span>
            )}
            {isNew && !isOnSale && (
              <span className="rounded-[var(--badge-radius)] bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                NEW
              </span>
            )}
          </div>

          {/* Quick add button (desktop hover only) */}
          {!isOutOfStock && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Navigate to PDP for size/color selection
                window.location.href = `/products/${product.slug}`;
              }}
              className="absolute bottom-0 left-0 right-0 flex translate-y-full items-center justify-center gap-2 bg-[var(--color-primary)] py-2.5 text-xs font-semibold uppercase tracking-wider text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden"
            >
              <ShoppingBag size={14} />
              Quick Add
            </button>
          )}
        </div>

        {/* Product info */}
        <div className="mt-2 px-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[var(--color-text)]">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {isOnSale ? (
              <>
                <span className="text-sm font-semibold text-[var(--color-sale)]">
                  {formatPrice(product.price)}
                </span>
                <span className="text-xs text-[var(--color-muted)] line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Color swatches */}
          {colorVariants.length > 1 && (
            <div className="mt-1.5 flex gap-1">
              {colorVariants.slice(0, 5).map((variant) => (
                <span
                  key={variant.id}
                  className="h-3.5 w-3.5 rounded-full border border-[var(--color-border)]"
                  style={{ backgroundColor: variant.colorHex || "#ccc" }}
                  title={variant.color || undefined}
                />
              ))}
              {colorVariants.length > 5 && (
                <span className="flex h-3.5 items-center text-[10px] text-[var(--color-muted)]">
                  +{colorVariants.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Wishlist button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsWishlisted((prev) => !prev);
        }}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={16}
          className={cn(
            "transition-colors",
            isWishlisted
              ? "fill-[var(--color-sale)] text-[var(--color-sale)]"
              : "text-[var(--color-text)]"
          )}
        />
      </button>
    </div>
  );
}
