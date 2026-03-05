"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { formatPrice } from "@earth-revibe/shared";

interface ProductCardProps {
  product: {
    name: string;
    slug: string;
    price: number | string;
    compareAtPrice?: number | string | null;
    images: { url: string; altText?: string | null }[];
    category?: { name: string } | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const price = Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const primaryImage = product.images?.[0]?.url || "/placeholder.jpg";
  const secondImage = product.images?.[1]?.url;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        {/* Image */}
        <div className="relative aspect-[3/4] bg-off-white overflow-hidden">
          <img
            src={primaryImage}
            alt={product.images?.[0]?.altText || product.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${secondImage ? "group-hover:opacity-0" : ""}`}
          />
          {secondImage && (
            <img
              src={secondImage}
              alt={product.images?.[1]?.altText || product.name}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          )}
          {/* Discount badge */}
          {compareAt && compareAt > price && (
            <span className="absolute top-3 left-3 bg-terracotta text-white text-xs font-semibold px-2 py-1 rounded-sm">
              {Math.round(((compareAt - price) / compareAt) * 100)}% OFF
            </span>
          )}
          {/* Wishlist button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/80 rounded-full hover:bg-white transition-colors"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={16}
              className={isWishlisted ? "fill-error text-error" : "text-charcoal"}
            />
          </button>
        </div>
        {/* Info */}
        <div className="p-4">
          {product.category && (
            <p className="text-[11px] font-semibold text-sage uppercase tracking-wide mb-1">
              {product.category.name}
            </p>
          )}
          <h3 className="text-sm font-medium text-deep-earth line-clamp-2 mb-2">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-charcoal">
              {formatPrice(price)}
            </span>
            {compareAt && compareAt > price && (
              <span className="text-xs text-medium-gray line-through">
                {formatPrice(compareAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
