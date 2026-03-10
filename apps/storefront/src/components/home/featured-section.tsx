'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api-client';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from './product-grid-skeleton';

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

interface FeaturedSectionProps {
  title: string;
  categorySlug: string;
  productsToShow?: number;
  showViewAll?: boolean;
}

export function FeaturedSection({
  title,
  categorySlug,
  productsToShow = 8,
  showViewAll = true,
}: FeaturedSectionProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['featured-products', categorySlug, productsToShow],
    queryFn: () =>
      api.get<ProductsResponse>(
        `/products?category=${encodeURIComponent(categorySlug)}&limit=${productsToShow}`
      ),
    retry: 2,
  });

  const products = data?.products ?? [];

  // Don't render the section at all if it errored or has no products
  if (isError || (!isLoading && products.length === 0)) {
    return null;
  }

  return (
    <section className="pt-16 lg:pt-24 pb-8 lg:pb-12 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 lg:mb-16 px-6 lg:px-14"
      >
        <h2
          className="font-medium uppercase"
          style={{
            fontFamily: 'var(--font-cinzel)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#999',
          }}
        >
          {title}
        </h2>
      </motion.div>

      {isLoading ? (
        <ProductGridSkeleton count={productsToShow} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-1.5 gap-y-5 px-3 sm:px-4 sm:gap-x-3 sm:gap-y-6 md:gap-x-4 md:gap-y-8 md:px-10 lg:gap-0 lg:px-0">
          {products.map((product, index) => (
            <div key={product.slug}>
              <ProductCard product={product} index={index} />
            </div>
          ))}
        </div>
      )}

      {showViewAll && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
          style={{ paddingTop: '48px' }}
        >
          <Link
            href={`/categories/${categorySlug}`}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-cinzel)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#000',
              borderBottom: '1px solid #000',
              padding: '12px 24px',
              textDecoration: 'none',
            }}
          >
            View All &rarr;
          </Link>
        </motion.div>
      )}
    </section>
  );
}
