'use client';

import { useEffect, useRef } from 'react';
import { ProductCard } from './product-card';
import { useRelatedProducts } from '@/hooks/use-products';

interface RelatedProductsProps {
  categorySlug: string | undefined;
  excludeProductId: string;
}

export function RelatedProducts({ categorySlug, excludeProductId }: RelatedProductsProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useRelatedProducts(
    categorySlug,
    excludeProductId
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const products = data?.pages.flatMap((page) => page.products) ?? [];

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (products.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-10">
      <h2 className="mb-6 text-lg font-bold uppercase tracking-wider">You May Also Like</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div ref={loadMoreRef} className="flex justify-center py-6">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            Loading more...
          </div>
        )}
      </div>
    </section>
  );
}
