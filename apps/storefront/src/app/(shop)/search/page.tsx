"use client";

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ChevronRight, X } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";
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

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const query = searchParams.get("q") || "";
  const sort = searchParams.get("sort");
  const { sortBy, sortOrder } = parseSort(sort);

  const [searchInput, setSearchInput] = useState(query);

  // Sync input with URL query
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const queryParams = useMemo(
    () => ({
      search: query || undefined,
      sortBy,
      sortOrder,
      limit: 12,
    }),
    [query, sortBy, sortOrder]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteProducts(queryParams);

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

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchInput.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [searchInput, router]
  );

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", sortToParam(newSortBy, newSortOrder));
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const clearSearch = useCallback(() => {
    setSearchInput("");
    router.push("/search");
  }, [router]);

  const allProducts = useMemo(
    () => data?.pages.flatMap((page) => page.products ?? []) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  return (
    <div className="px-4 py-6 md:px-8 lg:px-12 xl:px-20">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-[var(--color-muted)]">
        <Link href="/" className="transition-colors hover:text-[var(--color-text)]">
          Home
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text)]">Search</span>
      </nav>

      {/* Search input */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative mx-auto max-w-xl">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            className="h-12 w-full border border-[var(--color-border)] bg-white pl-11 pr-10 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Results header */}
      {query && (
        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {isLoading
                ? `Searching for "${query}"...`
                : `Results for "${query}"`}
            </h1>
            {!isLoading && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {totalCount} {totalCount === 1 ? "product" : "products"} found
              </p>
            )}
          </div>
          <SortDropdown
            currentSort={`${sortBy}-${sortOrder}`}
            onSortChange={handleSortChange}
          />
        </div>
      )}

      {/* Results */}
      {!query ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={48} className="mb-4 text-[var(--color-border)]" />
          <h2 className="text-lg font-semibold">Search our store</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Type a keyword to find products.
          </p>
        </div>
      ) : isLoading ? (
        <ProductGridSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Could not complete the search. Please try again.
          </p>
        </div>
      ) : allProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-5xl">:/</div>
          <h3 className="text-lg font-semibold">
            No results found for &ldquo;{query}&rdquo;
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Try a different keyword or browse our collections.
          </p>
          <Link
            href="/products"
            className="mt-4 border border-[var(--color-primary)] px-6 py-2 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
          >
            Browse All Products
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
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

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
