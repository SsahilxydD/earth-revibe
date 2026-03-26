'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useCategories } from '@/hooks/use-products';
import { Spinner } from '@/components/ui/spinner';
import { getImageUrl } from '@/lib/utils';

export default function CategoriesPage() {
  const { data: categories, isLoading, isError } = useCategories();

  return (
    <div className="px-4 py-6 md:px-8 lg:px-12 xl:px-20">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-[var(--color-muted)]">
        <Link href="/" className="transition-colors hover:text-[var(--color-text)]">
          Home
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--color-text)]">Categories</span>
      </nav>

      <h1 className="mb-8 text-xl font-bold uppercase tracking-wider md:text-2xl">
        Shop by Category
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Could not load categories. Please try again.
          </p>
        </div>
      ) : !categories || categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold">No categories yet</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Check back soon for our collections.
          </p>
          <Link
            href="/products"
            className="mt-4 border border-[var(--color-primary)] px-6 py-2 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)]"
          >
            Browse All Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700"
            >
              {category.image && (
                <Image
                  src={getImageUrl(category.image, 600)}
                  alt={category.name}
                  fill
                  className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 md:pb-8 px-4 text-center">
                <h3 className="text-white text-sm md:text-base font-semibold uppercase tracking-[0.15em]">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="mt-1 text-white/60 text-[10px] md:text-xs line-clamp-2">
                    {category.description}
                  </p>
                )}
                <span className="mt-2 text-white/70 text-[10px] md:text-xs uppercase tracking-[0.2em] border-b border-white/40 pb-0.5 group-hover:border-white/70 transition-colors">
                  Shop Now
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
