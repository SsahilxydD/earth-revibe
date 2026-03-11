"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ProductCard } from "@/components/product/product-card";
import { Pagination } from "@/components/product/pagination";
import { Suspense } from "react";

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const params = {
    page: searchParams.get("page") || "1",
    limit: "24",
    sortBy: searchParams.get("sortBy") || "createdAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
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

  const updateParams = (updates: Record<string, string | undefined>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) current.set(key, value);
      else current.delete(key);
    });
    router.push(`/products?${current.toString()}`);
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="h-16 lg:h-20" aria-hidden="true" />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-slate-100">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white">
              <div className="aspect-[3/4] w-full bg-slate-50 animate-pulse" />
              <div className="p-4">
                <div className="h-3 w-3/4 bg-slate-100 animate-pulse" />
                <div className="h-3 w-1/3 bg-slate-100 animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-slate-100">
            {(data?.products || []).map((product: any, index: number) => (
              <div key={product.slug || product.id} className="bg-white">
                <ProductCard product={product} index={index} />
              </div>
            ))}
          </div>
          {data?.totalPages > 1 && (
            <div className="py-12 flex justify-center">
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
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white min-h-screen">
          <div className="h-16 lg:h-20" aria-hidden="true" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-slate-100">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white">
                <div className="aspect-[3/4] w-full bg-slate-50 animate-pulse" />
                <div className="p-4">
                  <div className="h-3 w-3/4 bg-slate-100 animate-pulse" />
                  <div className="h-3 w-1/3 bg-slate-100 animate-pulse mt-2" />
                </div>
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
