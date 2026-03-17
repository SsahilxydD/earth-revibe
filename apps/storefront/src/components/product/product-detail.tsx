"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Minus, Plus, Loader2, ChevronRight, Heart } from "lucide-react";
import { cn, formatPrice, getImageUrl } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/providers";
import { Accordion } from "./accordion";
import { RelatedProducts } from "./related-products";
import type { Product, ProductVariant } from "@/types";

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
    <div className="space-y-2.5 text-[13px] leading-[1.6]">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-2">
          <span className="shrink-0 text-[#999999]">
            {row.label}:
          </span>
          <span className="text-[#666666]">{row.value}</span>
        </div>
      ))}
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
/*  Detail Tabs (Mobile — Zara-style)                                  */
/* ------------------------------------------------------------------ */

type TabKey = "description" | "composition" | "measurements" | "shipping";

function DetailTabs({
  description,
  compositionRows,
  detailRows,
  shippingRows,
}: {
  description: string | null;
  compositionRows: MetafieldRow[];
  detailRows: MetafieldRow[];
  shippingRows: MetafieldRow[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("description");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "DESCRIPTION" },
    { key: "composition", label: "COMPOSITION" },
    { key: "measurements", label: "MEASUREMENTS" },
    { key: "shipping", label: "SHIPPING & RETURNS" },
  ];

  return (
    <div>
      {/* Tab headers */}
      <div className="flex gap-6 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "pb-3 text-xs font-bold tracking-wider transition-colors",
              activeTab === tab.key
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-5 text-[13px] leading-[1.6] tracking-normal text-[#666666]" style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
        {activeTab === "description" && description && (
          <div dangerouslySetInnerHTML={{ __html: description }} />
        )}
        {activeTab === "description" && !description && (
          <p className="text-[var(--color-muted)]">No description available.</p>
        )}
        {activeTab === "composition" && compositionRows.length > 0 && (
          <MetafieldSection rows={compositionRows} />
        )}
        {activeTab === "composition" && compositionRows.length === 0 && (
          <p className="text-[var(--color-muted)]">No composition info available.</p>
        )}
        {activeTab === "measurements" && detailRows.length > 0 && (
          <MetafieldSection rows={detailRows} />
        )}
        {activeTab === "measurements" && detailRows.length === 0 && (
          <p className="text-[var(--color-muted)]">No measurement info available.</p>
        )}
        {activeTab === "shipping" && shippingRows.length > 0 && (
          <MetafieldSection rows={shippingRows} />
        )}
        {activeTab === "shipping" && shippingRows.length === 0 && (
          <p className="text-[var(--color-muted)]">No shipping info available.</p>
        )}
      </div>
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

  const hasDetails =
    detailsFitRows.length > 0 ||
    compositionCareRows.length > 0 ||
    shippingReturnsRows.length > 0 ||
    additionalInfoRows.length > 0;

  /* Sort and split images for the editorial layout */
  const sortedImages = useMemo(
    () => [...product.images].sort((a, b) => a.sortOrder - b.sortOrder),
    [product.images]
  );
  const firstImage = sortedImages[0] || null;

  /* ---- shared UI fragments ---- */

  const colorSelector = colors.length > 0 && (
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
  );

  const sizeSelector = sizes.length > 0 && (
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
  );

  const quantitySelector = (
    <div className="mt-6">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider">Quantity</div>
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
  );

  const lowStockWarning = selectedVariant &&
    selectedVariant.lowStockThreshold &&
    selectedVariant.stock > 0 &&
    selectedVariant.stock <= selectedVariant.lowStockThreshold && (
      <p className="mt-2 text-xs font-medium text-[var(--color-sale)]">
        Only {selectedVariant.stock} left in stock!
      </p>
    );

  const renderActions = () => (
    <div className="mt-6 flex flex-col gap-3">
      <button
        onClick={handleAddToCart}
        disabled={!canAddToCart || isAdding}
        className={cn(
          "flex h-[45px] w-full items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-opacity",
          canAddToCart
            ? "bg-[var(--color-primary)] text-white hover:opacity-90"
            : "cursor-not-allowed bg-[var(--color-sold-out)] text-white"
        )}
      >
        {isAdding ? <Loader2 size={18} className="animate-spin" /> : "Add to Cart"}
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
  );

  const renderAccordions = () => (
    <div className="border-t border-[var(--color-border)] border-opacity-0">
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
  );

  return (
    <div>
      {/* ===== DESKTOP LAYOUT (lg+) ===== */}
      <div className="hidden lg:block px-4 py-6 md:px-8 lg:px-12 xl:px-20">
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

        {/* Section 1: First image LEFT + Product info RIGHT */}
        <div className="grid grid-cols-2 items-start gap-10">
          <div>
            {firstImage && (
              <Image
                src={getImageUrl(firstImage.url, 1200)}
                alt={firstImage.altText || product.name}
                width={800}
                height={1200}
                quality={75}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="h-auto w-full"
                priority
              />
            )}
          </div>

          {/* Product info panel — sticky */}
          <div className="sticky top-24">
            <h1 className="text-2xl font-semibold uppercase leading-tight tracking-wide">
              {product.name}
            </h1>

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
              MRP incl. of all taxes
            </p>

            {product.shortDescription && (
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                {product.shortDescription}
              </p>
            )}

            {colorSelector}
            {sizeSelector}
            {quantitySelector}
            {lowStockWarning}
            {renderActions()}

            {/* Description */}
            {product.description && (
              <div className="mt-8 border-t border-[var(--color-border)] border-opacity-0 pt-6">
                <div
                  className="prose prose-sm max-w-none text-sm leading-relaxed text-[var(--color-text)]"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>
        </div>

        {/* All remaining images + accordions */}
        {(sortedImages.length > 1 || hasDetails) && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {hasDetails && <div>{renderAccordions()}</div>}
            {sortedImages.slice(1).map((img) => (
              <div key={img.id}>
                <Image
                  src={getImageUrl(img.url, 1200)}
                  alt={img.altText || product.name}
                  width={800}
                  height={1200}
                  quality={75}
                  sizes="50vw"
                  className="h-auto w-full"
                />
              </div>
            ))}
          </div>
        )}

        {/* Related products */}
        <RelatedProducts
          categorySlug={product.category?.slug}
          excludeProductId={product.id}
        />
      </div>

      {/* ===== MOBILE LAYOUT (Zara-style) ===== */}
      <div className="pb-[120px] lg:hidden">
        {/* First image — full-bleed */}
        {firstImage && (
          <Image
            src={getImageUrl(firstImage.url, 800)}
            alt={firstImage.altText || product.name}
            width={800}
            height={1200}
            quality={75}
            sizes="100vw"
            className="h-auto w-full"
            priority
          />
        )}

        {/* Detail tabs — after 1st image */}
        <div className="mt-6">
          <DetailTabs
            description={product.description}
            compositionRows={compositionCareRows}
            detailRows={detailsFitRows}
            shippingRows={shippingReturnsRows}
          />
        </div>

        {/* Color code / SKU reference */}
        {selectedColor && (
          <div className="mt-2 px-4 text-xs text-[var(--color-muted)] uppercase tracking-wide">
            {selectedColor} | {product.slug}
          </div>
        )}

        {/* Remaining images — after tabs */}
        {sortedImages.length > 1 && (
          <div className="mt-4 flex flex-col">
            {sortedImages.slice(1).map((img) => (
              <Image
                key={img.id}
                src={getImageUrl(img.url, 800)}
                alt={img.altText || product.name}
                width={800}
                height={1200}
                quality={75}
                sizes="100vw"
                className="h-auto w-full"
              />
            ))}
          </div>
        )}

        {/* Color & size selectors */}
        <div className="px-4 pt-4">
          {colorSelector}
          {sizeSelector}
        </div>

        {/* Additional info accordion (if any) */}
        {additionalInfoRows.length > 0 && (
          <div className="mt-4 px-4">
            <Accordion title="Additional Info">
              <MetafieldSection rows={additionalInfoRows} />
            </Accordion>
          </div>
        )}

        {/* Related products */}
        <div className="px-4">
          <RelatedProducts
            categorySlug={product.category?.slug}
            excludeProductId={product.id}
          />
        </div>
      </div>

      {/* Fixed mobile bottom dock — Zara-style */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Product name + price */}
        <div className="px-4 pt-3">
          <p className="text-sm font-semibold uppercase tracking-wide">{product.name}</p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-sm",
                isOnSale && "text-[var(--color-sale)]"
              )}
            >
              {formatPrice(displayPrice)}
            </span>
            {isOnSale && (
              <span className="text-xs text-[var(--color-muted)] line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            MRP incl. of all taxes
          </p>
        </div>

        {/* ADD button — clean outlined style */}
        <div className="px-4 py-3">
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart || isAdding}
            className={cn(
              "flex h-12 w-full items-center justify-center border text-sm font-bold uppercase tracking-[0.2em] transition-colors",
              canAddToCart
                ? "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                : "cursor-not-allowed border-[var(--color-sold-out)] text-[var(--color-sold-out)]"
            )}
          >
            {isAdding ? <Loader2 size={16} className="animate-spin" /> : "ADD"}
          </button>
        </div>
      </div>
    </div>
  );
}
