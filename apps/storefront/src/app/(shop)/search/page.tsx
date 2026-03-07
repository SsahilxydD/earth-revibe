"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/product/pagination";
import Link from "next/link";
import { Suspense } from "react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") || "";
  const page = searchParams.get("page") || "1";

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, page],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(q)}&page=${page}&limit=20`),
    enabled: q.length > 0,
  });

  const updatePage = (newPage: number) => {
    const current = new URLSearchParams(searchParams.toString());
    current.set("page", String(newPage));
    router.push(`/search?${current.toString()}`);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20" aria-hidden="true" />

      {/* Hero strip */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto py-8 sm:py-10">
          <h1 className="text-[13px] sm:text-[15px] font-[var(--font-cinzel)] font-semibold tracking-[0.10em] uppercase text-slate-900">
            {q ? (
              <>
                Search results for{" "}
                <span className="text-slate-500">&lsquo;{q}&rsquo;</span>
              </>
            ) : (
              "Search"
            )}
          </h1>
        </div>
      </div>

      <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto pt-6 pb-24 lg:pb-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[11px] tracking-[0.08em] uppercase text-slate-500 mb-6 font-[var(--font-cinzel)] font-semibold">
          <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <span className="text-slate-400">&gt;</span>
          <span className="text-slate-900">Search</span>
        </nav>

        {/* Product count */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.12em] uppercase text-slate-400">
            {!q
              ? "Enter a search term to find products"
              : isLoading
                ? "\u00A0"
                : data?.total > 0
                  ? `${data.total} ${data.total === 1 ? "result" : "results"}`
                  : "0 results"}
          </p>
        </div>

        {/* Results */}
        {!q ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <svg
              className="w-16 h-16 text-slate-200 mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <p className="text-[13px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-slate-800 mb-2">
              Search our collection
            </p>
            <p className="text-[12px] text-slate-500 text-center">
              Enter a search term above to find products.
            </p>
          </div>
        ) : isLoading ? (
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
        ) : (
          <>
            <ProductGrid products={data?.products || []} />
            {data?.totalPages > 1 && (
              <div className="mt-16 mb-8">
                <Pagination
                  currentPage={data.page}
                  totalPages={data.totalPages}
                  onPageChange={updatePage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white min-h-screen">
          <div className="h-16 lg:h-20" aria-hidden="true" />
          <div className="bg-slate-50 border-b border-slate-100">
            <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto py-8 sm:py-10">
              <div className="h-4 w-48 bg-slate-200 animate-pulse" />
            </div>
          </div>
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
      <SearchContent />
    </Suspense>
  );
}
