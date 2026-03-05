"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterSidebar } from "@/components/product/filter-sidebar";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { Pagination } from "@/components/product/pagination";
import { Skeleton } from "@/components/ui";
import { SlidersHorizontal } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import Link from "next/link";
import { Suspense } from "react";

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setFilterDrawerOpen } = useUIStore();

  const params = {
    page: searchParams.get("page") || "1",
    limit: "20",
    sortBy: searchParams.get("sortBy") || "createdAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
    category: searchParams.get("category") || undefined,
    size: searchParams.get("size") || undefined,
    color: searchParams.get("color") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    material: searchParams.get("material") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const queryString = Object.entries(params)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");

  const { data, isLoading } = useQuery({
    queryKey: ["products", queryString],
    queryFn: () => api.get(`/products?${queryString}`),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
  });

  const updateParams = (updates: Record<string, string | undefined>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) current.set(key, value);
      else current.delete(key);
    });
    // Reset page on filter change unless page itself is being updated
    if (!("page" in updates)) {
      current.set("page", "1");
    }
    router.push(`/products?${current.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-medium-gray mb-6">
        <Link href="/" className="hover:text-forest-green transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-charcoal">All Products</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold text-deep-earth">
          All Products
        </h1>
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-light-gray rounded-lg text-sm"
            onClick={() => setFilterDrawerOpen(true)}
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
          <SortDropdown
            value={`${params.sortBy}-${params.sortOrder}`}
            onChange={(val) => {
              const [sortBy, sortOrder] = val.split("-");
              updateParams({ sortBy, sortOrder });
            }}
          />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop filter sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <FilterSidebar
            onFilterChange={updateParams}
            currentFilters={params}
            categories={categoriesData?.categories || []}
          />
        </div>

        {/* Mobile filter drawer */}
        <div className="lg:hidden">
          <FilterSidebar
            onFilterChange={updateParams}
            currentFilters={params}
            categories={categoriesData?.categories || []}
          />
        </div>

        {/* Products */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {data?.total > 0 && (
                <p className="text-sm text-medium-gray mb-4">
                  {data.total} products
                </p>
              )}
              <ProductGrid products={data?.products || []} />
              {data?.totalPages > 1 && (
                <Pagination
                  currentPage={data.page}
                  totalPages={data.totalPages}
                  onPageChange={(page) =>
                    updateParams({ page: String(page) })
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
