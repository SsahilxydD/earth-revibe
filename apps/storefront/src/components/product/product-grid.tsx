import { ProductCard } from "./product-card";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-6xl">:/</div>
        <h3 className="text-lg font-semibold">No products found</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-[1px] bg-slate-100 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
