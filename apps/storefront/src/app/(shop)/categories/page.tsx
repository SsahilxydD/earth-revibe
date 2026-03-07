"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount: number;
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories"),
  });

  return (
    <div className="bg-white min-h-screen">
      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20" aria-hidden="true" />

      {/* Hero */}
      <div className="relative h-48 md:h-64 w-full bg-gradient-to-br from-[#2c2c2c] via-[#3a3028] to-[#1a1a1a] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" />
        <h1 className="relative z-10 text-4xl md:text-6xl font-[var(--font-cinzel)] tracking-[0.25em] uppercase text-white text-center px-4">
          Collections
        </h1>
      </div>

      <p className="text-center text-[10px] tracking-[0.2em] uppercase font-[var(--font-cinzel)] text-slate-400 py-4 border-b border-slate-100">
        Explore our sustainable collections
      </p>

      <div className="px-3 sm:px-4 md:px-10 max-w-7xl mx-auto py-10 pb-24 lg:pb-10">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/3] w-full bg-slate-100 animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-100 animate-pulse" />
                <div className="h-3 w-1/4 bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !categories?.length ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <p className="text-[13px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-slate-800 mb-2">
              No collections yet
            </p>
            <p className="text-[12px] text-slate-500 text-center">
              Check back soon for our sustainable collections.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group block"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#2c2c2c] via-[#3a3028] to-[#1a1a1a]">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl font-[var(--font-cinzel)] tracking-[0.2em] uppercase text-white/60">
                        {category.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                <div className="mt-3 px-1">
                  <h2 className="text-[13px] font-[var(--font-cinzel)] font-medium tracking-[0.1em] uppercase text-slate-900">
                    {category.name}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {category.productCount} {category.productCount === 1 ? "product" : "products"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}