"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatPrice } from "@earth-revibe/shared";
import { ImageGallery } from "@/components/product/image-gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductReviews } from "@/components/product/product-reviews";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get(`/products/${slug}`),
  });

  // Auto-select when only one option exists — must be before any early returns
  useEffect(() => {
    if (!product) return;
    const colors = Array.from(new Set((product.variants || []).map((v: any) => String(v.color))));
    const sizes = Array.from(new Set((product.variants || []).map((v: any) => String(v.size))));
    if (colors.length === 1) setSelectedColor(colors[0] as string);
    if (sizes.length === 1) setSelectedSize(sizes[0] as string);
  }, [product]);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="h-16 lg:h-20" aria-hidden="true" />
        <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            <div className="aspect-[3/4] w-full bg-slate-100 animate-pulse" />
            <div className="space-y-4 py-4">
              <div className="h-3 w-1/4 bg-slate-100 animate-pulse" />
              <div className="h-5 w-3/4 bg-slate-100 animate-pulse" />
              <div className="h-4 w-1/4 bg-slate-100 animate-pulse" />
              <div className="h-24 w-full bg-slate-100 animate-pulse mt-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white min-h-screen">
        <div className="h-16 lg:h-20" aria-hidden="true" />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="text-center">
            <h1 className="font-[var(--font-cinzel)] text-2xl text-black mb-4">Product Not Found</h1>
            <p className="text-slate-500 text-[12px]">The product you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasVariants = product.variants?.length > 0;

  const selectedVariant = hasVariants
    ? product.variants.find((v: any) => v.size === selectedSize && v.color === selectedColor) || null
    : { id: product.id, size: "", color: "", stock: 999, price: product.price };

  const price = selectedVariant?.price ? Number(selectedVariant.price) : Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;

  const accordions = [
    { id: "details", title: "Product Details", content: product.description },
    { id: "care", title: "Care Instructions", content: product.careInstructions || "Follow the care label instructions on the garment." },
    { id: "shipping", title: "Shipping & Returns", content: "Free shipping on orders above Rs 2,000. Easy returns within 7 days of delivery." },
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20" aria-hidden="true" />

      <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto py-6 pb-24 lg:pb-8">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.08em] uppercase text-slate-500 mb-6 font-[var(--font-cinzel)] font-semibold">
          <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <span className="text-slate-400">&gt;</span>
          <Link href="/products" className="hover:text-slate-900 transition-colors">All</Link>
          <span className="text-slate-400">&gt;</span>
          <span className="text-slate-900 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Image Gallery */}
          <ImageGallery images={product.images || []} />

          {/* Product Info */}
          <div className="space-y-4 lg:py-2">
            {product.category && (
              <p className="text-[10px] tracking-[0.12em] uppercase text-slate-400">
                {product.category.name}
              </p>
            )}

            <h1 className="text-[16px] md:text-[18px] font-medium tracking-[0.02em] text-black leading-snug">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-[15px] text-black">
                {formatPrice(price)}
              </span>
              {compareAt && compareAt > price && (
                <>
                  <span className="text-[13px] text-slate-400 line-through">{formatPrice(compareAt)}</span>
                  <span className="text-[10px] font-medium tracking-[0.06em] uppercase text-red-500">
                    {Math.round(((compareAt - price) / compareAt) * 100)}% off
                  </span>
                </>
              )}
            </div>

            {product.shortDescription && (
              <p className="text-[12px] leading-[1.8] text-slate-600 pt-1">{product.shortDescription}</p>
            )}

            {/* Variant Selector */}
            {product.variants?.length > 0 && (
              <div className="pt-2">
                <VariantSelector
                  variants={product.variants}
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                  onSizeChange={setSelectedSize}
                  onColorChange={setSelectedColor}
                />
              </div>
            )}

            {/* Add to Cart + Buy Now */}
            <div className="pt-1">
              <AddToCart
                variant={selectedVariant || null}
                product={product}
                disabled={!selectedSize || !selectedColor}
              />
            </div>

            {/* Accordion sections */}
            <div className="border-t border-slate-100 pt-2 space-y-0">
              {accordions.map((acc) => (
                <div key={acc.id} className="border-b border-slate-100">
                  <button
                    onClick={() => setOpenAccordion(openAccordion === acc.id ? null : acc.id)}
                    className="flex items-center justify-between w-full py-4 min-h-[44px] text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black"
                  >
                    {acc.title}
                    <svg
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openAccordion === acc.id ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openAccordion === acc.id && (
                    <div className="pb-4 text-[12px] text-slate-600 leading-[1.9] whitespace-pre-line">
                      {acc.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-16 border-t border-slate-100 pt-12">
          <h2 className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.15em] uppercase text-slate-400 mb-8">
            Customer Reviews
          </h2>
          <ProductReviews reviews={product.reviews || []} />
        </section>
      </div>
    </div>
  );
}
