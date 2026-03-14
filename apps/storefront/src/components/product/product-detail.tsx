"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Minus, Plus, Loader2, ChevronRight, Heart } from "lucide-react";
import { cn, formatPrice, getImageUrl } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/providers";
import { Accordion } from "./accordion";
import { RelatedProducts } from "./related-products";
import type { Product, ProductImage, ProductVariant } from "@/types";

interface ProductDetailProps {
  product: Product;
}

/* ------------------------------------------------------------------ */
/*  Variant helpers                                                    */
/* ------------------------------------------------------------------ */

function getUniqueColors(variants: ProductVariant[]) {
  const seen = new Map<string, string | null>();
  for (const v of variants) {
    if (v.color && !seen.has(v.color)) {
      seen.set(v.color, v.colorHex);
    }
  }
  return Array.from(seen.entries()).map(([name, hex]) => ({ name, hex: hex || "#ccc" }));
}

function getUniqueSizes(variants: ProductVariant[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const v of variants) {
    if (v.size && !seen.has(v.size)) {
      seen.add(v.size);
      result.push(v.size);
    }
  }
  return result;
}

function getVariantStock(
  variants: ProductVariant[],
  color: string | null,
  size: string | null
): number {
  const match = variants.find(
    (v) =>
      (color === null || v.color === color) &&
      (size === null || v.size === size)
  );
  return match?.stock ?? 0;
}

function getSelectedVariant(
  variants: ProductVariant[],
  color: string | null,
  size: string | null
): ProductVariant | undefined {
  return variants.find(
    (v) =>
      (color === null || v.color === color) &&
      (size === null || v.size === size)
  );
}

/* ------------------------------------------------------------------ */
/*  Metafield helpers                                                  */
/* ------------------------------------------------------------------ */

interface MetafieldRow {
  label: string;
  value: string;
}

function buildDetailsFit(p: Product): MetafieldRow[] {
  const rows: MetafieldRow[] = [];
  if (p.material) rows.push({ label: "Material", value: p.material });
  if (p.fit) rows.push({ label: "Fit", value: p.fit });
  if (p.composition) rows.push({ label: "Composition", value: p.composition });
  if (p.fabricGsm) rows.push({ label: "Fabric GSM", value: String(p.fabricGsm) });
  if (p.neckline) rows.push({ label: "Neckline", value: p.neckline });
  if (p.sleeveLength) rows.push({ label: "Sleeve Length", value: p.sleeveLength });
  if (p.measurements) rows.push({ label: "Measurements", value: p.measurements });
  if (p.printType) rows.push({ label: "Print Type", value: p.printType });
  if (p.colorPattern) rows.push({ label: "Color Pattern", value: p.colorPattern });
  return rows;
}

function buildCompositionCare(p: Product): MetafieldRow[] {
  const rows: MetafieldRow[] = [];
  if (p.composition) rows.push({ label: "Composition", value: p.composition });
  if (p.careInstructions) rows.push({ label: "Care Instructions", value: p.careInstructions });
  if (p.washInstructions) rows.push({ label: "Wash Instructions", value: p.washInstructions });
  if (p.fabricWeight) rows.push({ label: "Fabric Weight", value: p.fabricWeight });
  return rows;
}

function buildShippingReturns(p: Product): MetafieldRow[] {
  const rows: MetafieldRow[] = [];
  if (p.shippingInfo) rows.push({ label: "Shipping", value: p.shippingInfo });
  if (p.returnsInfo) rows.push({ label: "Returns", value: p.returnsInfo });
  if (p.origin) rows.push({ label: "Origin", value: p.origin });
  return rows;
}

function buildAdditionalInfo(p: Product): MetafieldRow[] {
  const rows: MetafieldRow[] = [];
  if (p.productType) rows.push({ label: "Product Type", value: p.productType });
  if (p.vendor) rows.push({ label: "Vendor", value: p.vendor });
  if (p.ageGroup) rows.push({ label: "Age Group", value: p.ageGroup });
  if (p.targetGender) rows.push({ label: "Gender", value: p.targetGender });
  if (p.waistRise) rows.push({ label: "Waist Rise", value: p.waistRise });
  if (p.pantsLengthType) rows.push({ label: "Pants Length", value: p.pantsLengthType });
  if (p.topLengthType) rows.push({ label: "Top Length", value: p.topLengthType });
  if (p.outerwearFeatures) rows.push({ label: "Outerwear Features", value: p.outerwearFeatures });
  if (p.dimensions) rows.push({ label: "Dimensions", value: p.dimensions });
  if (p.weight != null && p.weightUnit) {
    rows.push({ label: "Weight", value: `${p.weight} ${p.weightUnit}` });
  } else if (p.weight != null) {
    rows.push({ label: "Weight", value: String(p.weight) });
  }
  return rows;
}

function MetafieldSection({ rows }: { rows: MetafieldRow[] }) {
  return (
    <div className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-2">
          <span className="shrink-0 font-medium text-[var(--color-muted)]">
            {row.label}:
          </span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Gallery                                                      */
/* ------------------------------------------------------------------ */

function ImageGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const sorted = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainImageRef = useRef<HTMLDivElement>(null);

  const activeImage = sorted[activeIndex] || null;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainImageRef.current) return;
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && activeIndex < sorted.length - 1) {
          setActiveIndex((prev) => prev + 1);
        } else if (diff < 0 && activeIndex > 0) {
          setActiveIndex((prev) => prev - 1);
        }
      }
    },
    [activeIndex, sorted.length]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center bg-[var(--color-surface)] text-[var(--color-muted)]">
        No image available
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: thumbnails + main image */}
      <div className="hidden md:flex md:gap-3">
        <div
          className="flex w-[72px] shrink-0 flex-col gap-2 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {sorted.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative aspect-[2/3] w-full overflow-hidden border-2 transition-colors",
                idx === activeIndex
                  ? "border-[var(--color-primary)]"
                  : "border-transparent hover:border-[var(--color-border)]"
              )}
            >
              <Image
                src={getImageUrl(img.url, 150, img.thumbnailUrl)}
                alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                fill
                sizes="72px"
                className="object-cover"
              />
            </button>
          ))}
        </div>

        <div
          ref={mainImageRef}
          className="relative flex-1 cursor-crosshair overflow-hidden bg-[var(--color-surface)]"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          <div className="relative aspect-[2/3]">
            {activeImage && (
              <Image
                src={getImageUrl(activeImage.url, 1200)}
                alt={activeImage.altText || productName}
                fill
                sizes="(max-width: 1024px) 60vw, 50vw"
                quality={100}
                unoptimized
                className={cn(
                  "object-cover transition-transform duration-300",
                  isZoomed && "scale-150"
                )}
                style={
                  isZoomed
                    ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                    : undefined
                }
                priority
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile: swipe carousel */}
      <div className="md:hidden">
        <div
          className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--color-surface)]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {activeImage && (
            <Image
              src={getImageUrl(activeImage.url, 800)}
              alt={activeImage.altText || productName}
              fill
              sizes="100vw"
              quality={100}
                unoptimized
              className="object-cover"
              priority
            />
          )}
        </div>
        {sorted.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {sorted.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  idx === activeIndex
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-border)]"
                )}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Star Rating                                                        */
/* ------------------------------------------------------------------ */

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={cn(
              star <= Math.round(rating)
                ? "fill-[var(--color-star)] text-[var(--color-star)]"
                : "fill-none text-[var(--color-border)]"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--color-muted)]">
        ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ProductDetail({ product }: ProductDetailProps) {
  const colors = useMemo(() => getUniqueColors(product.variants), [product.variants]);
  const sizes = useMemo(() => getUniqueSizes(product.variants), [product.variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.length > 0 ? colors[0].name : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const addToCartRef = useRef<HTMLButtonElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const { addToast } = useToast();

  const selectedVariant = useMemo(
    () => getSelectedVariant(product.variants, selectedColor, selectedSize),
    [product.variants, selectedColor, selectedSize]
  );

  const displayPrice = selectedVariant?.price ?? product.price;
  const isOnSale =
    product.compareAtPrice !== null && product.compareAtPrice > displayPrice;

  const canAddToCart =
    (colors.length === 0 || selectedColor !== null) &&
    (sizes.length === 0 || selectedSize !== null) &&
    (selectedVariant ? selectedVariant.stock > 0 : true);

  useEffect(() => {
    if (!addToCartRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(addToCartRef.current);
    return () => observer.disconnect();
  }, []);

  const handleAddToCart = async () => {
    if (!canAddToCart) {
      if (sizes.length > 0 && !selectedSize) {
        addToast("Please select a size", "error");
      }
      return;
    }

    setIsAdding(true);
    await new Promise((r) => setTimeout(r, 300));

    const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];

    addItem({
      id: selectedVariant?.id || product.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url || "",
      price: displayPrice,
      compareAtPrice: product.compareAtPrice ?? undefined,
      size: selectedSize || "",
      color: selectedColor || "",
      maxQuantity: selectedVariant?.stock ?? 99,
      quantity,
    });

    addToast("Added to cart", "success");
    setIsAdding(false);
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
  };

  const detailsFitRows = buildDetailsFit(product);
  const compositionCareRows = buildCompositionCare(product);
  const shippingReturnsRows = buildShippingReturns(product);
  const additionalInfoRows = buildAdditionalInfo(product);

  return (
    <div>
      <div className="px-4 py-6 md:px-8 lg:px-12 xl:px-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-[var(--color-muted)]">
          <Link href="/" className="transition-colors hover:text-[var(--color-text)]">
            Home
          </Link>
          <ChevronRight size={12} />
          {product.category && (
            <>
              <Link
                href={`/categories/${product.category.slug}`}
                className="transition-colors hover:text-[var(--color-text)]"
              >
                {product.category.name}
              </Link>
              <ChevronRight size={12} />
            </>
          )}
          <span className="text-[var(--color-text)]">{product.name}</span>
        </nav>

        {/* 2-col desktop, stack mobile */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Left: Image gallery */}
          <div className="lg:w-[55%]">
            <div className="lg:sticky lg:top-24">
              <ImageGallery images={product.images} productName={product.name} />
            </div>
          </div>

          {/* Right: Product info */}
          <div className="flex-1">
            <h1 className="text-2xl font-semibold leading-tight">{product.name}</h1>

            {product.averageRating !== null && product.reviewCount > 0 && (
              <div className="mt-2">
                <StarRating rating={product.averageRating} count={product.reviewCount} />
              </div>
            )}

            <div className="mt-4 flex items-baseline gap-3">
              <span
                className={cn(
                  "text-xl font-semibold",
                  isOnSale && "text-[var(--color-sale)]"
                )}
              >
                {formatPrice(displayPrice)}
              </span>
              {isOnSale && (
                <span className="text-sm text-[var(--color-muted)] line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Tax included. Shipping calculated at checkout.
            </p>

            {product.shortDescription && (
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                {product.shortDescription}
              </p>
            )}

            {/* Color selector */}
            {colors.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider">
                  Color:{" "}
                  <span className="font-normal normal-case text-[var(--color-muted)]">
                    {selectedColor}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      title={color.name}
                      className={cn(
                        "h-9 w-9 rounded-full border-2 transition-all",
                        selectedColor === color.name
                          ? "ring-2 ring-[var(--color-primary)] ring-offset-2"
                          : "border-[var(--color-border)] hover:scale-110",
                        color.name.toLowerCase() === "white" && "border-gray-300"
                      )}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Size:{" "}
                    <span className="font-normal normal-case text-[var(--color-muted)]">
                      {selectedSize || "Select a size"}
                    </span>
                  </span>
                  <button className="text-xs font-medium text-[var(--color-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-text)]">
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const stock = getVariantStock(product.variants, selectedColor, size);
                    const isOutOfStock = stock <= 0;
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          if (!isOutOfStock) setSelectedSize(size);
                        }}
                        disabled={isOutOfStock}
                        className={cn(
                          "flex h-10 min-w-[3.5rem] items-center justify-center border px-4 text-sm font-semibold transition-colors",
                          isSelected
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : isOutOfStock
                              ? "cursor-not-allowed border-[var(--color-border)] text-[var(--color-sold-out)] line-through"
                              : "border-[var(--color-primary)] hover:bg-[var(--color-surface)]"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider">
                Quantity
              </div>
              <div className="inline-flex items-center border border-[var(--color-border)]">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--color-surface)]"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="flex h-10 w-12 items-center justify-center border-x border-[var(--color-border)] text-sm font-semibold">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedVariant?.stock ?? 99, q + 1))
                  }
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--color-surface)]"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Low stock warning */}
            {selectedVariant &&
              selectedVariant.lowStockThreshold &&
              selectedVariant.stock > 0 &&
              selectedVariant.stock <= selectedVariant.lowStockThreshold && (
                <p className="mt-2 text-xs font-medium text-[var(--color-sale)]">
                  Only {selectedVariant.stock} left in stock!
                </p>
              )}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                ref={addToCartRef}
                onClick={handleAddToCart}
                disabled={!canAddToCart || isAdding}
                className={cn(
                  "flex h-[45px] w-full items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-opacity",
                  canAddToCart
                    ? "bg-[var(--color-primary)] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-[var(--color-sold-out)] text-white"
                )}
              >
                {isAdding ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Add to Cart"
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!canAddToCart || isAdding}
                className={cn(
                  "flex h-[45px] w-full items-center justify-center border-2 text-sm font-bold uppercase tracking-wider transition-colors",
                  canAddToCart
                    ? "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-surface)]"
                    : "cursor-not-allowed border-[var(--color-sold-out)] text-[var(--color-sold-out)]"
                )}
              >
                Buy Now
              </button>

              <button
                onClick={() => setIsWishlisted((prev) => !prev)}
                className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
              >
                <Heart
                  size={14}
                  className={cn(
                    isWishlisted && "fill-[var(--color-sale)] text-[var(--color-sale)]"
                  )}
                />
                {isWishlisted ? "Added to Wishlist" : "Add to Wishlist"}
              </button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-8 border-t border-[var(--color-border)] pt-6">
                <div
                  className="prose prose-sm max-w-none text-sm leading-relaxed text-[var(--color-text)]"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {/* Accordion sections */}
            <div className="mt-6 border-t border-[var(--color-border)]">
              {detailsFitRows.length > 0 && (
                <Accordion title="Details & Fit" defaultOpen>
                  <MetafieldSection rows={detailsFitRows} />
                </Accordion>
              )}
              {compositionCareRows.length > 0 && (
                <Accordion title="Composition & Care">
                  <MetafieldSection rows={compositionCareRows} />
                </Accordion>
              )}
              {shippingReturnsRows.length > 0 && (
                <Accordion title="Shipping & Returns">
                  <MetafieldSection rows={shippingReturnsRows} />
                </Accordion>
              )}
              {additionalInfoRows.length > 0 && (
                <Accordion title="Additional Info">
                  <MetafieldSection rows={additionalInfoRows} />
                </Accordion>
              )}
            </div>
          </div>
        </div>

        {/* Related products */}
        <RelatedProducts
          categorySlug={product.category?.slug}
          excludeProductId={product.id}
        />
      </div>

      {/* Sticky mobile add-to-cart bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white px-4 py-3 transition-transform duration-300 md:hidden",
          showStickyBar ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="text-sm font-semibold text-[var(--color-sale)]">
              {formatPrice(displayPrice)}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart || isAdding}
            className={cn(
              "flex h-10 shrink-0 items-center justify-center gap-2 px-6 text-xs font-bold uppercase tracking-wider",
              canAddToCart
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-sold-out)] text-white"
            )}
          >
            {isAdding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Add to Cart"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
