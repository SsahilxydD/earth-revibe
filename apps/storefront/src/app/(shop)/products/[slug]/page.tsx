"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Heart, ChevronDown, Truck, RotateCcw, Shield } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatPrice } from "@earth-revibe/shared";
import { ImageGallery } from "@/components/product/image-gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductReviews } from "@/components/product/product-reviews";
import { Skeleton } from "@/components/ui";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get(`/products/${slug}`),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="text-center py-16 text-medium-gray">Product not found</div>;

  const selectedVariant = product.variants?.find(
    (v: any) => v.size === selectedSize && v.color === selectedColor
  );
  const price = selectedVariant?.price ? Number(selectedVariant.price) : Number(product.price);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;

  const accordions = [
    { id: "details", title: "Product Details", content: product.description },
    { id: "care", title: "Care Instructions", content: product.careInstructions || "Follow the care label instructions on the garment." },
    { id: "shipping", title: "Shipping & Returns", content: "Free shipping on orders above Rs 2,000. Easy returns within 7 days of delivery." },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-medium-gray mb-6">
        <Link href="/" className="hover:text-forest-green">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-forest-green">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-charcoal">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <ImageGallery images={product.images || []} />

        {/* Product Info */}
        <div className="space-y-6">
          {product.category && (
            <p className="text-xs font-semibold text-sage uppercase tracking-wide">{product.category.name}</p>
          )}
          <h1 className="text-2xl lg:text-3xl font-heading font-semibold text-deep-earth">{product.name}</h1>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-charcoal">{formatPrice(price)}</span>
            {compareAt && compareAt > price && (
              <>
                <span className="text-lg text-medium-gray line-through">{formatPrice(compareAt)}</span>
                <span className="text-sm font-semibold text-terracotta">
                  {Math.round(((compareAt - price) / compareAt) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-dark-gray">{product.shortDescription}</p>
          )}

          {/* Variant Selector */}
          {product.variants?.length > 0 && (
            <VariantSelector
              variants={product.variants}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              onSizeChange={setSelectedSize}
              onColorChange={setSelectedColor}
            />
          )}

          {/* Add to Cart */}
          <AddToCart
            variant={selectedVariant || null}
            product={product}
            disabled={!selectedSize || !selectedColor}
          />

          {/* Wishlist */}
          <button className="flex items-center gap-2 text-sm text-dark-gray hover:text-forest-green transition-colors">
            <Heart size={18} /> Add to Wishlist
          </button>

          {/* Quick info badges */}
          <div className="flex gap-6 pt-4 border-t border-light-gray">
            <div className="flex items-center gap-2 text-xs text-dark-gray">
              <Truck size={16} className="text-forest-green" /> Free shipping over Rs 2,000
            </div>
            <div className="flex items-center gap-2 text-xs text-dark-gray">
              <RotateCcw size={16} className="text-forest-green" /> 7-day returns
            </div>
            <div className="flex items-center gap-2 text-xs text-dark-gray">
              <Shield size={16} className="text-forest-green" /> Secure payment
            </div>
          </div>

          {/* Accordion sections */}
          <div className="border-t border-light-gray pt-4 space-y-0">
            {accordions.map((acc) => (
              <div key={acc.id} className="border-b border-light-gray">
                <button
                  onClick={() => setOpenAccordion(openAccordion === acc.id ? null : acc.id)}
                  className="flex items-center justify-between w-full py-4 text-sm font-medium text-charcoal"
                >
                  {acc.title}
                  <ChevronDown size={16} className={`transition-transform ${openAccordion === acc.id ? "rotate-180" : ""}`} />
                </button>
                {openAccordion === acc.id && (
                  <div className="pb-4 text-sm text-dark-gray leading-relaxed whitespace-pre-line">
                    {acc.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <h2 className="text-xl font-heading font-semibold text-deep-earth mb-6">Customer Reviews</h2>
        <ProductReviews reviews={product.reviews || []} />
      </section>
    </div>
  );
}
