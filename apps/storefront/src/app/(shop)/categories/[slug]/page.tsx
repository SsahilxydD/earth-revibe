'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { X, Truck, Wind, Luggage, Sun, ShieldCheck, RefreshCw, Headphones } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';
import { FilterSidebar, type FilterState } from '@/components/product/filter-sidebar';
import { SortDropdown } from '@/components/product/sort-dropdown';
import { useInfiniteProducts, useCategories } from '@/hooks/use-products';
import { useProductNavStore } from '@/stores/product-nav-store';
import { Spinner } from '@/components/ui/spinner';

function parseSort(sort: string | null): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  switch (sort) {
    case 'price-asc':
      return { sortBy: 'price', sortOrder: 'asc' };
    case 'price-desc':
      return { sortBy: 'price', sortOrder: 'desc' };
    case 'popular':
      return { sortBy: 'reviewCount', sortOrder: 'desc' };
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' };
  }
}

function sortToParam(sortBy: string, sortOrder: 'asc' | 'desc'): string {
  if (sortBy === 'price' && sortOrder === 'asc') return 'price-asc';
  if (sortBy === 'price' && sortOrder === 'desc') return 'price-desc';
  if (sortBy === 'reviewCount') return 'popular';
  return 'newest';
}

function CategoryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const slug = params.slug as string;

  const { data: categories } = useCategories();
  const currentCategory = categories?.find((c) => c.slug === slug);

  const sort = searchParams.get('sort');
  const minPriceRaw = searchParams.get('minPrice');
  const maxPriceRaw = searchParams.get('maxPrice');
  const size = searchParams.get('size') || '';
  const color = searchParams.get('color') || '';

  const { sortBy, sortOrder } = parseSort(sort);
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined;
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined;

  const queryParams = useMemo(
    () => ({
      category: slug,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      sizes: size ? [size] : undefined,
      colors: color ? [color] : undefined,
      limit: 12,
    }),
    [slug, sortBy, sortOrder, minPrice, maxPrice, size, color]
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteProducts(queryParams);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '200px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) p.set(key, value);
        else p.delete(key);
      }
      const qs = p.toString();
      router.push(`/categories/${slug}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [searchParams, router, slug]
  );

  const handleFilterChange = useCallback(
    (filters: FilterState) => {
      updateParams({
        minPrice: filters.minPrice !== undefined ? String(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice !== undefined ? String(filters.maxPrice) : undefined,
        size: filters.size || undefined,
        color: filters.color || undefined,
      });
    },
    [updateParams]
  );

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
      updateParams({ sort: sortToParam(newSortBy, newSortOrder) });
    },
    [updateParams]
  );

  const allProducts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.products ?? []);
  }, [data]);

  const totalCount = data?.pages?.[0]?.total ?? allProducts.length;
  const categoryName = currentCategory?.name || slug.replace(/-/g, ' ');

  const setNavContext = useProductNavStore((s) => s.setNavContext);
  useEffect(() => {
    if (allProducts.length > 0) {
      const productSlugs = allProducts.map((p) => p.slug);
      setNavContext(productSlugs, categoryName, `/categories/${slug}`);
    }
  }, [allProducts, categoryName, slug, setNavContext]);

  const currentFilters: FilterState = { category: slug, minPrice, maxPrice, size, color };
  const hasActiveFilters = !!(minPrice || maxPrice || size || color);
  const clearFilter = (key: string) => {
    updateParams({ [key]: undefined });
  };

  const clearAllFilters = () => {
    updateParams({ minPrice: undefined, maxPrice: undefined, size: undefined, color: undefined });
  };

  return (
    <div className="font-[family-name:var(--font-inter)]" style={{ backgroundColor: '#FFF' }}>
      {/* Free shipping banner — 36px, black */}
      <div
        style={{
          height: 36,
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Truck size={12} color="#FFF" />
        <span style={{ fontSize: 9, fontWeight: 400, color: '#FFF', letterSpacing: 1.5 }}>
          FREE SHIPPING ON ALL ORDERS
        </span>
      </div>

      {/* Header — breadcrumb, title, count */}
      <div
        style={{ padding: '24px 28px 16px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <p style={{ fontSize: 10, fontWeight: 300, color: '#CCC', letterSpacing: 0.5 }}>
          Home / Categories / {categoryName}
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: '#000',
            letterSpacing: -0.5,
            textTransform: 'capitalize',
          }}
        >
          {categoryName}
        </h1>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
          {totalCount} PRODUCTS
        </span>
      </div>

      {/* Category hero — 220px, warm bg, vacation tagline */}
      {currentCategory?.description && (
        <div
          style={{
            height: 220,
            backgroundColor: '#EDE8DF',
            padding: '0 28px 24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <p
            style={{
              fontSize: 20,
              fontWeight: 300,
              color: '#000',
              letterSpacing: -0.3,
              lineHeight: 1.35,
            }}
          >
            Pack light, look effortless.{'\n'}Made for warm days ahead.
          </p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wind size={11} color="#999" />
              <span style={{ fontSize: 9, fontWeight: 300, color: '#999', letterSpacing: 0.3 }}>
                Breathable
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Luggage size={11} color="#999" />
              <span style={{ fontSize: 9, fontWeight: 300, color: '#999', letterSpacing: 0.3 }}>
                Travel-ready
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sun size={11} color="#999" />
              <span style={{ fontSize: 9, fontWeight: 300, color: '#999', letterSpacing: 0.3 }}>
                Sun-washed tones
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Filter bar — 44px */}
      <div
        style={{
          height: 44,
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FilterSidebar filters={currentFilters} onFilterChange={handleFilterChange} />
        <SortDropdown currentSort={`${sortBy}-${sortOrder}`} onSortChange={handleSortChange} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div
          style={{
            padding: '10px 28px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {size && (
            <button
              onClick={() => clearFilter('size')}
              style={{
                display: 'inline-flex',
                height: 28,
                padding: '0 12px',
                gap: 6,
                alignItems: 'center',
                backgroundColor: '#F5F5F5',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 400, color: '#000', letterSpacing: 0.5 }}>
                Size: {size}
              </span>
              <X size={10} color="#999" />
            </button>
          )}
          {(minPrice || maxPrice) && (
            <button
              onClick={() => {
                clearFilter('minPrice');
                clearFilter('maxPrice');
              }}
              style={{
                display: 'inline-flex',
                height: 28,
                padding: '0 12px',
                gap: 6,
                alignItems: 'center',
                backgroundColor: '#F5F5F5',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 400, color: '#000', letterSpacing: 0.5 }}>
                {minPrice ? `₹${(minPrice / 1000).toFixed(0)}k` : '₹0'} —{' '}
                {maxPrice ? `₹${(maxPrice / 1000).toFixed(0)}k` : '∞'}
              </span>
              <X size={10} color="#999" />
            </button>
          )}
          {color && (
            <button
              onClick={() => clearFilter('color')}
              style={{
                display: 'inline-flex',
                height: 28,
                padding: '0 12px',
                gap: 6,
                alignItems: 'center',
                backgroundColor: '#F5F5F5',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 400, color: '#000', letterSpacing: 0.5 }}>
                {color}
              </span>
              <X size={10} color="#999" />
            </button>
          )}
          <button
            onClick={clearAllFilters}
            style={{
              fontSize: 10,
              fontWeight: 300,
              color: '#999',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Product grid */}
      {isLoading ? (
        <div style={{ padding: '14px 28px 28px 28px' }}>
          <ProductGridSkeleton />
        </div>
      ) : isError ? (
        <div style={{ padding: '80px 28px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>
            Something went wrong. Please try again.
          </p>
        </div>
      ) : allProducts.length === 0 ? (
        <div
          style={{
            padding: '80px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>No products found</p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                marginTop: 20,
                height: 46,
                padding: '0 32px',
                border: '1px solid #000',
                backgroundColor: 'transparent',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 2,
                color: '#000',
                cursor: 'pointer',
              }}
            >
              CLEAR FILTERS
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: '14px 28px 28px 28px' }}>
          {/* 2-col grid, gap=14, row gap=20 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 14px' }}>
            {allProducts.map((product, i) => {
              const items = [];
              items.push(<ProductCard key={product.id} product={product} index={i} />);
              // Vacation quote strip after first row (2 products)
              if (i === 1) {
                items.push(
                  <div
                    key="vacation-quote"
                    style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      height: 80,
                    }}
                  >
                    <div style={{ width: 24, height: 1, backgroundColor: '#CCC' }} />
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 300,
                        color: '#999',
                        fontStyle: 'italic',
                        textAlign: 'center',
                      }}
                    >
                      &ldquo;Wear it like you&apos;re already there.&rdquo;
                    </p>
                    <div style={{ width: 24, height: 1, backgroundColor: '#CCC' }} />
                  </div>
                );
              }
              return items;
            })}
          </div>

          {/* Trust strip — after all products */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 0 0' }}>
            {[
              { icon: ShieldCheck, label: 'Secure\nPayment' },
              { icon: RefreshCw, label: 'Easy\nReturns' },
              { icon: Truck, label: 'Free\nShipping' },
              { icon: Headphones, label: '24/7\nSupport' },
            ].map((t) => (
              <div
                key={t.label}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              >
                <t.icon size={16} color="#CCC" strokeWidth={1.5} />
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 300,
                    color: '#CCC',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div
            ref={loadMoreRef}
            style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}
          >
            {isFetchingNextPage && <Spinner className="h-5 w-5" />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={null}>
      <CategoryContent />
    </Suspense>
  );
}
