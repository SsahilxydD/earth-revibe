'use client';

import { ProductCard } from './product-card';
import { useRelatedProducts } from '@/hooks/use-products';

interface RelatedProductsProps {
  categorySlug: string | undefined;
  excludeProductId: string;
}

export function RelatedProducts({ categorySlug, excludeProductId }: RelatedProductsProps) {
  const { data } = useRelatedProducts(categorySlug, excludeProductId);

  const products = data?.products || [];

  if (products.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-10">
      <h2 className="mb-6 text-lg font-bold uppercase tracking-wider">You May Also Like</h2>

      {/* Vertical wrapping grid — no horizontal scroll that conflicts with swipe */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
