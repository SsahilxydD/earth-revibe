'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ProductCard } from '@/components/product/product-card';
import { SectionHeader } from './section-header';
import { ProductGridSkeleton } from './product-grid-skeleton';
import { ShopAllLink } from './shop-all-link';

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

export function FeaturedSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () =>
      api.get<ProductsResponse>('/products?isFeatured=true&limit=4'),
  });

  const products = data?.products ?? [];

  return (
    <section className="pt-16 lg:pt-24 pb-8 lg:pb-12 bg-white">
      <SectionHeader
        subtitle="Customer Favorites"
        title="Bestsellers"
      />
      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-1.5 gap-y-5 px-3 sm:px-4 sm:gap-x-3 sm:gap-y-6 md:gap-x-4 md:gap-y-8 md:px-10 lg:gap-0 lg:px-0">
          {products.map((product, index) => (
            <div key={product.slug}>
              <ProductCard product={product} index={index} />
            </div>
          ))}
        </div>
      )}
      <ShopAllLink href="/products" label="Shop All Products" />
    </section>
  );
}
