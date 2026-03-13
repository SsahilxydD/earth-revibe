"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";
import { FilterSidebar, type FilterState } from "@/components/product/filter-sidebar";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { useInfiniteProducts } from "@/hooks/use-products";

function parseSort(sort: string | null): { sortBy: string; sortOrder: "asc" | "desc" } {
  switch (sort) {
    case "price-asc":
      return { sortBy: "price", sortOrder: "asc" };
    case "price-desc":
      return { sortBy: "price", sortOrder: "desc" };
    case "popular":
      return { sortBy: "reviewCount", sortOrder: "desc" };
    default:
      return { sortBy: "createdAt", sortOrder: "desc" };
  }
}

function sortToParam(sortBy: string, sortOrder: "asc" | "desc"): string {
  if (sortBy === "price" && sortOrder === "asc") return "price-asc";
  if (sortBy === "price" && sortOrder === "desc") return "price-desc";
  if (sortBy === "reviewCount") return "popular";
  return "newest";
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort");
  const minPriceRaw = searchParams.get("minPrice");
  const maxPriceRaw = searchParams.get("maxPrice");
  const size = searchParams.get("size") || "";
  const color = searchParams.get("color") || "";
  const search = searchParams.get("search") || "";

  const { sortBy, sortOrder } = parseSort(sort);
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;

  const queryParams = useMemo(
    () => ({
      category: category || undefined,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      sizes: size ? [size] : undefined,
      colors: color ? [color] : undefined,
      search: search || undefined,
      limit: 12,
    }),
    [category, sortBy, sortOrder, minPrice, maxPrice, size, color, search]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteProducts(queryParams);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/products?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleFilterChange = useCallback(
    (filters: FilterState) => {
      updateParams({
        category: filters.category || undefined,
        minPrice: filters.minPrice !== undefined ? String(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice !== undefined ? String(filters.maxPrice) : undefined,
        size: filters.size || undefined,
        color: filters.color || undefined,
      });
    },
    [updateParams]
  );

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      updateParams({ sort: sortToParam(newSortBy, newSortOrder) });
    },
    [updateParams]
  );

  const allProducts = useMemo(
    () => data?.pages.flatMap((page) => page.products ?? []) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  const currentFilters: FilterState = {
    category,
    minPrice,
    maxPrice,
    size,
    color,
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-[var(--color-muted)]">
        <Link href="/" className="transition-colors hover:text-[var(--color-text)]">
          Home
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text)]">
          {search ? `Search: "${search}"` : "All Products"}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider md:text-2xl">
            {search ? `Results for "${search}"` : "All Products"}
          </h1>
          {!isLoading && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {totalCount} {totalCount === 1 ? "product" : "products"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <FilterSidebar filters={currentFilters} onFilterChange={handleFilterChange} />
          <SortDropdown
            currentSort={`${sortBy}-${sortOrder}`}
            onSortChange={handleSortChange}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ProductGridSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Could not load products. Please try again.
          </p>
        </div>
      ) : allProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-5xl">:/</div>
          <h3 className="text-lg font-semibold">No products found</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Try adjusting your filters or search terms.
          </p>
          <button
            onClick={() => router.push("/products")}
            className="mt-4 border border-[var(--color-primary)] px-6 py-2 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-[1px] bg-slate-100 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                Loading more...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}
