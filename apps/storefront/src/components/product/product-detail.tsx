"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Star, Minus, Plus, Loader2, ChevronRight, Heart } from "lucide-react";
// Lazy-load DOMPurify to avoid jsdom SSR crash (ENOENT default-stylesheet.css).
// sanitize() is a no-op during SSR — the HTML re-renders correctly on hydration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _purify: any = null;
function sanitizeHTML(dirty: string): string {
  if (typeof window === "undefined") return dirty;
  if (!_purify) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _purify = require("isomorphic-dompurify");
    if (_purify.default) _purify = _purify.default;
  }
  return _purify.sanitize(dirty);
}
import { cn, formatPrice, getImageUrl, BLUR_DATA_URL } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/providers";
import { Accordion } from "./accordion";
import { RelatedProducts } from "./related-products";
import type { Product, ProductVariant } from "@/types";

interface ProductDetailProps {
  product: Product;
  /** When true, hides fixed elements (dock, size sheet) — used for swipe preview panels */
  isPreview?: boolean;
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
  if (p.measurements) rows.push({ label: "Measurements", value: p.measurements });
  if (p.printType) rows.push({ label: "Print Type", value: p.printType });
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

function buildAdditionalInfo(_p: Product): MetafieldRow[] {
  return [];
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

type TabKey = "description" | "composition" | "sizechart";

function MeasureGuideSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const measurements = [
    { name: "CHEST", desc: "Measure from one side to the other at the height of the armhole." },
    { name: "FRONT LENGTH", desc: "Measure from the shoulder seam to the hem of the garment." },
    { name: "SLEEVE LENGTH", desc: "Measure from the shoulder seam to the bottom of the sleeve." },
    { name: "BACK WIDTH", desc: "Measure from one shoulder seam to the other." },
    { name: "ARM WIDTH", desc: "Tape perpendicular to the sleeve up to the armhole." },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black transition-opacity duration-300 ${
          isOpen ? "opacity-50 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[61] bg-white transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-10 bg-white pt-5 pb-3 flex justify-center">
          <div className="w-10 h-[3px] rounded-full bg-[#d0d0d0]" />
        </div>

        <div className="px-7 pb-8">
          <h3 className="text-[15px] tracking-[0.15em] text-[var(--color-text)] mt-4" style={{ fontWeight: 300 }}>
            HOW WE MEASURE THE GARMENT
          </h3>

          <div style={{ marginTop: "32px" }}>
            {measurements.map((m, i) => (
              <div key={m.name} style={{ paddingTop: i === 0 ? 0 : "16px" }}>
                <p className="text-[13px] tracking-wide text-[var(--color-text)]" style={{ lineHeight: 1, fontWeight: 400 }}>{m.name}</p>
                <p className="text-[13px] text-[#666666]" style={{ marginTop: "8px", lineHeight: 1.5, fontWeight: 300 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SizeChartTable() {
  const [unit, setUnit] = useState<"CM" | "IN">("IN");
  const [showGuide, setShowGuide] = useState(false);

  const dataIN = [
    { area: "Chest", s: "39", m: "42", l: "45", xl: "48" },
    { area: "Front length", s: "25", m: "26", l: "27", xl: "28" },
    { area: "Sleeve length", s: "10.5", m: "10.5", l: "10.5", xl: "10.5" },
    { area: "Shoulder", s: "21", m: "22", l: "23", xl: "24" },
  ];

  const dataCM = dataIN.map((row) => ({
    area: row.area,
    s: (parseFloat(row.s) * 2.54).toFixed(1),
    m: (parseFloat(row.m) * 2.54).toFixed(1),
    l: (parseFloat(row.l) * 2.54).toFixed(1),
    xl: (parseFloat(row.xl) * 2.54).toFixed(1),
  }));

  const sizes = ["S", "M", "L", "XL"];

  return (
    <div>
      {/* Disclaimer */}
      <p className="text-[13px] leading-[1.8] text-[#666666]">
        The measurements may vary slightly due to the production process.
      </p>
      <p className="mt-4 text-[13px] leading-[1.8] text-[#666666]">
        The garment is measured on a flat surface
      </p>
      <button
        type="button"
        onClick={() => setShowGuide((v) => !v)}
        className="text-[13px] text-[#666666]"
        style={{ marginTop: "16px" }}
      >
        See <span className="underline underline-offset-2">how we measure the garment</span>
      </button>

      {/* CM / IN toggle */}
      <div className="flex items-center gap-4" style={{ marginTop: "16px" }}>
        <button
          type="button"
          onClick={() => setUnit("CM")}
          className={`text-[13px] transition-colors ${
            unit === "CM"
              ? "text-[var(--color-text)] font-medium"
              : "text-[#999999]"
          }`}
        >
          CM
        </button>
        <button
          type="button"
          onClick={() => setUnit("IN")}
          className={`text-[13px] transition-colors ${
            unit === "IN"
              ? "text-[var(--color-text)] font-medium"
              : "text-[#999999]"
          }`}
        >
          IN
        </button>
      </div>

      {/* Size chart table — CM values are always rendered (invisible) to reserve wider column widths */}
      <table className="w-full" style={{ marginTop: "8px", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <thead>
          <tr>
            <th className="text-left text-[13px] font-bold text-[var(--color-text)]" style={{ paddingBottom: "8px" }}>AREA</th>
            {sizes.map((s) => (
              <th key={s} className="text-left text-[13px] font-bold text-[var(--color-text)]" style={{ paddingBottom: "8px" }}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataIN.map((rowIN, i) => {
            const rowCM = dataCM[i];
            const active = unit === "IN" ? rowIN : rowCM;
            const ghost = unit === "IN" ? rowCM : rowIN;
            return (
              <tr key={rowIN.area}>
                <td className="text-[13px] text-[#666666]" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
                  {rowIN.area}
                </td>
                {(["s", "m", "l", "xl"] as const).map((col) => (
                  <td key={col} className="text-[13px] text-[#666666]" style={{ paddingTop: "8px", paddingBottom: "8px", position: "relative" }}>
                    {/* ghost value — invisible but holds column width */}
                    <span aria-hidden style={{ visibility: "hidden", display: "block", height: 0, overflow: "hidden" }}>
                      {ghost[col]}
                    </span>
                    {/* visible value */}
                    <span style={{ position: "absolute", top: "8px", left: 0 }}>
                      {active[col]}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bottom sheet for measurement guide */}
      <MeasureGuideSheet isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

function DetailTabs({
  description,
  compositionRows,
}: {
  description: string | null;
  compositionRows: MetafieldRow[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("description");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "DESCRIPTION" },
    { key: "composition", label: "COMPOSITION" },
    { key: "sizechart", label: "SIZE CHART" },
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
      <div className="px-4 pb-5 text-[13px] leading-[1.6] tracking-normal text-[#666666]" style={{ paddingTop: 0, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
        {activeTab === "description" && description && (
          <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(description) }} />
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
        {activeTab === "sizechart" && <SizeChartTable />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ProductDetail({ product, isPreview = false }: ProductDetailProps) {
  const colors = useMemo(() => getUniqueColors(product.variants), [product.variants]);
  const sizes = useMemo(() => getUniqueSizes(product.variants), [product.variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.length > 0 ? colors[0].name : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showSizeSheet, setShowSizeSheet] = useState(false);

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

  const handleMobileAddToCart = () => {
    if (sizes.length > 0) {
      setShowSizeSheet(true);
      return;
    }
    handleAddToCart();
  };

  const handleAddToCart = async () => {
    if (sizes.length > 0 && !selectedSize) {
      setShowSizeSheet(true);
      return;
    }
    if (!canAddToCart) return;

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

  const handleSizeSheetSelect = async (size: string) => {
    setSelectedSize(size);
    setShowSizeSheet(false);

    const variant = getSelectedVariant(product.variants, selectedColor, size);
    if (!variant || variant.stock <= 0) return;

    setIsAdding(true);
    await new Promise((r) => setTimeout(r, 300));

    const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
    addItem({
      id: variant.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: primaryImage?.url || "",
      price: variant.price ?? product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
      size,
      color: selectedColor || "",
      maxQuantity: variant.stock,
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
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
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
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.description) }}
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
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
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
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        )}

        {/* Detail tabs — after 1st image */}
        <div style={{ marginTop: "16px" }}>
          <DetailTabs
            description={product.description}
            compositionRows={compositionCareRows}
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
          <div className="mt-4 flex flex-col" style={{ gap: "16px" }}>
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
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            ))}
          </div>
        )}

        {/* Color selector (size is handled by bottom sheet on add-to-cart) */}
        {colors.length > 0 && (
          <div className="px-4 pt-4">
            {colorSelector}
          </div>
        )}

        {/* Accordions — measurements, shipping, additional info */}
        {(detailsFitRows.length > 0 || shippingReturnsRows.length > 0 || additionalInfoRows.length > 0) && (
          <div className="mt-4 px-4">
            {detailsFitRows.length > 0 && (
              <Accordion title="Measurements">
                <MetafieldSection rows={detailsFitRows} />
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
        )}

        {/* Sentinel — marks where the dock should collapse. Static div, no async dependency. */}
        <div data-dock-hide aria-hidden="true" />

        {/* Related products */}
        <div className="px-4">
          <RelatedProducts
            categorySlug={product.category?.slug}
            excludeProductId={product.id}
          />
        </div>
      </div>

      {/* Mobile bottom dock — portaled to body so it works inside overflow containers. */}
      {!isPreview && mounted && createPortal(<div
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

        {/* ADD button — always opens size sheet on mobile when sizes exist */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleMobileAddToCart}
            disabled={isAdding}
            className="flex h-12 w-full items-center justify-center border text-sm font-bold uppercase tracking-[0.2em] transition-colors border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
          >
            {isAdding ? <Loader2 size={16} className="animate-spin" /> : "ADD"}
          </button>
        </div>
      </div>, document.body)}

      {/* ===== SIZE SELECTION SHEET (portaled to body so it works inside overflow containers) ===== */}
      {!isPreview && mounted && createPortal(<>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-[70] bg-black transition-opacity duration-300 ${
            showSizeSheet ? "opacity-50 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setShowSizeSheet(false)}
        />

        {/* Sheet */}
        <div
          className={`fixed inset-x-0 bottom-0 z-[71] bg-white transition-transform duration-300 ease-out ${
            showSizeSheet ? "translate-y-0" : "translate-y-full"
          }`}
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Drag handle */}
          <div className="sticky top-0 z-10 bg-white pt-5 pb-3 flex justify-center">
            <div className="w-10 h-[3px] rounded-full bg-[#d0d0d0]" />
          </div>

          <div className="px-6 pb-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-center text-[var(--color-text)]">
              Select Size
            </h3>

            <div className="mt-6 flex flex-col">
              {sizes.map((size) => {
                const stock = getVariantStock(product.variants, selectedColor, size);
                const isOutOfStock = stock <= 0;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      if (!isOutOfStock) handleSizeSheetSelect(size);
                    }}
                    disabled={isOutOfStock}
                    className={cn(
                      "py-4 text-center text-sm uppercase tracking-wider border-b border-[var(--color-border)]/10 transition-colors",
                      isOutOfStock
                        ? "text-[var(--color-sold-out)] cursor-not-allowed"
                        : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>, document.body)}
    </div>
  );
}
