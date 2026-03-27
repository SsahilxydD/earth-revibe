'use client';

import { useEffect, useRef, Component, type ReactNode } from 'react';
import Link from 'next/link';
import { ProductCard } from './product-card';
import { useRelatedProducts } from '@/hooks/use-products';

const MAX_PAGES = 2; // Cap at 24 products to keep footer reachable

/* ------------------------------------------------------------------ */
/*  Error Boundary — isolates failures so footer always renders        */
/* ------------------------------------------------------------------ */
class RelatedErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Inner component                                                    */
/* ------------------------------------------------------------------ */
interface RelatedProductsInnerProps {
  categorySlug: string | undefined;
  excludeProductId: string;
}

function RelatedProductsInner({ categorySlug, excludeProductId }: RelatedProductsInnerProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useRelatedProducts(
    categorySlug,
    excludeProductId
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const pageCount = data?.pages.length ?? 0;
  const products = data?.pages.flatMap((page) => page.products) ?? [];
  const canLoadMore = hasNextPage && pageCount < MAX_PAGES;

  useEffect(() => {
    if (!loadMoreRef.current || !canLoadMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && canLoadMore && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, isFetchingNextPage, fetchNextPage]);

  if (products.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-10">
      <h2 className="mb-6 text-lg font-bold uppercase tracking-wider">You May Also Like</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Load more trigger — only fires if under MAX_PAGES */}
      {canLoadMore && (
        <div ref={loadMoreRef} className="flex justify-center py-6">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
              Loading more...
            </div>
          )}
        </div>
      )}

      {/* View all link when there are more products beyond the cap */}
      {!canLoadMore && hasNextPage && (
        <div className="flex justify-center py-6">
          <Link
            href="/products"
            className="border border-[var(--color-primary)] px-6 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
          >
            View All Products
          </Link>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component — wrapped in error boundary                       */
/* ------------------------------------------------------------------ */
interface RelatedProductsProps {
  categorySlug: string | undefined;
  excludeProductId: string;
}

export function RelatedProducts({ categorySlug, excludeProductId }: RelatedProductsProps) {
  return (
    <RelatedErrorBoundary>
      <RelatedProductsInner categorySlug={categorySlug} excludeProductId={excludeProductId} />
    </RelatedErrorBoundary>
  );
}
