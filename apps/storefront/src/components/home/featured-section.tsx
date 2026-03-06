"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeader } from "./section-header";

interface ProductImage {
  url: string;
  altText?: string | null;
}

interface Product {
  name: string;
  slug: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  images: ProductImage[];
  category?: { name: string } | null;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-xl aspect-[3/4] mb-4" />
      <div className="space-y-2 px-1">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

export function FeaturedSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () =>
      api.get<ProductsResponse>("/products?status=ACTIVE&isFeatured=true&limit=4"),
  });

  const products = data?.products ?? [];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <SectionHeader subtitle="Customer Favorites" title="Bestsellers" />
      <div className="px-6 lg:px-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
        </div>
      </div>
    </section>
  );
}
