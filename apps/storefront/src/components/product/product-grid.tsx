"use client";

import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: any[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <svg
          className="w-16 h-16 text-slate-200 mb-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <p className="text-[13px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-slate-800 mb-2">
          No products found
        </p>
        <p className="text-[12px] text-slate-500 text-center">
          Try adjusting your filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-1.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:gap-x-4 md:gap-y-8">
      {products.map((product, index) => (
        <ProductCard key={product.slug || product.id} product={product} index={index} />
      ))}
    </div>
  );
}
