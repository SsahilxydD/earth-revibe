"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterSidebar } from "@/components/product/filter-sidebar";
import { SortDropdown } from "@/components/product/sort-dropdown";
import { Pagination } from "@/components/product/pagination";
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", queryString],
    queryFn: () => api.get(`/products?${queryString}`),
    retry: 2,
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
    if (!("page" in updates)) {
      current.set("page", "1");
    }
    router.push(`/products?${current.toString()}`);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20" aria-hidden="true" />

      <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto pt-6 pb-24 lg:pb-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[11px] tracking-[0.08em] uppercase text-slate-500 mb-6 font-[var(--font-cinzel)] font-semibold">
          <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <span className="text-slate-400">&gt;</span>
          <span className="text-slate-900">All Products</span>
        </nav>

        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-400">
            {data?.total > 0 ? `${data.total} ${data.total === 1 ? 'product' : 'products'}` : '\u00A0'}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 min-h-[44px] border border-slate-200 text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase hover:border-black transition-colors"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
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

        {/* Mobile filter drawer — fixed overlay, outside flex flow */}
        <div className="lg:hidden">
          <FilterSidebar
            onFilterChange={updateParams}
            currentFilters={params}
            categories={Array.isArray(categoriesData) ? categoriesData : []}
          />
        </div>

        <div className="flex lg:gap-10">
          {/* Desktop filter sidebar */}
          <div className="hidden lg:block w-56 shrink-0">
            <FilterSidebar
              onFilterChange={updateParams}
              currentFilters={params}
              categories={Array.isArray(categoriesData) ? categoriesData : []}
            />
          </div>

          {/* Products */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-1.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:gap-x-4 md:gap-y-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="aspect-[3/4] w-full bg-slate-100 animate-pulse" />
                    <div className="px-1">
                      <div className="h-3 w-3/4 bg-slate-100 animate-pulse" />
                      <div className="h-3 w-1/3 bg-slate-100 animate-pulse mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-24 px-6">
                <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-[13px] font-medium text-slate-800 mb-1">
                  Unable to load products
                </p>
                <p className="text-[12px] text-slate-500 text-center mb-4">
                  {(error as any)?.message || "Something went wrong. Please try again."}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-[11px] font-medium tracking-[0.06em] uppercase border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <ProductGrid products={data?.products || []} />
                {data?.totalPages > 1 && (
                  <div className="mt-16 mb-8">
                    <Pagination
                      currentPage={data.page}
                      totalPages={data.totalPages}
                      onPageChange={(page) =>
                        updateParams({ page: String(page) })
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white min-h-screen">
          <div className="h-16 lg:h-20" aria-hidden="true" />
          <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto py-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-1.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:gap-x-4 md:gap-y-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] w-full bg-slate-100 animate-pulse" />
                  <div className="px-1">
                    <div className="h-3 w-3/4 bg-slate-100 animate-pulse" />
                    <div className="h-3 w-1/3 bg-slate-100 animate-pulse mt-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
