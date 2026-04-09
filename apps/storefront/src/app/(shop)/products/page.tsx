'use client';

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { X, Wind, Luggage, Sun, ShieldCheck, RefreshCw, Truck, Headphones } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton';
import { FilterSidebar, type FilterState } from '@/components/product/filter-sidebar';
import { SortDropdown } from '@/components/product/sort-dropdown';
import { useInfiniteProducts } from '@/hooks/use-products';
import { useProductNavStore } from '@/stores/product-nav-store';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'framer-motion';

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

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort');
  const minPriceRaw = searchParams.get('minPrice');
  const maxPriceRaw = searchParams.get('maxPrice');
  const size = searchParams.get('size') || '';
  const color = searchParams.get('color') || '';
  const search = searchParams.get('search') || '';

  const [activeMood, setActiveMood] = useState<string>('');

  const MOOD_KEYWORDS: Record<string, string[]> = {
    beach: ['Aqua', 'Coastal', 'Marine', 'Tidewater', 'Shoreline', 'Water', 'Blu ', 'Alpine Ivory'],
    brunch: [
      'Polo',
      'polo',
      'Cream',
      'Formal',
      'Herbal White',
      'Minimal',
      'Two-Panel',
      'Skin-Conscious',
      'Countryside',
    ],
    sunset: [
      'Ember',
      'Fireside',
      'Solstice',
      'Dustroad',
      'Mocha',
      'Desert',
      'Maroon',
      'Khakhi',
      'Earthstone',
      'Golden',
    ],
    poolside: [
      'Cloudweave',
      'Windpath',
      'Garden Sage',
      'Tropical',
      'Plain Blue',
      'Alpine',
      'Coastal',
    ],
    island: [
      'Terra',
      'Void',
      'Ether',
      'Vintage',
      'Cargo',
      'Utility',
      'Olive',
      'Wildflower',
      'Trail',
    ],
  };

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
      limit: 48,
    }),
    [category, sortBy, sortOrder, minPrice, maxPrice, size, color, search]
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
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
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
    (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
      updateParams({ sort: sortToParam(newSortBy, newSortOrder) });
    },
    [updateParams]
  );

  const rawProducts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.products ?? []);
  }, [data]);

  const allProducts = useMemo(() => {
    if (!activeMood || !MOOD_KEYWORDS[activeMood]) return rawProducts;
    const keywords = MOOD_KEYWORDS[activeMood];
    return rawProducts.filter((p) => keywords.some((kw) => p.name.includes(kw)));
  }, [rawProducts, activeMood]);

  const totalCount = data?.pages?.[0]?.total ?? allProducts.length;

  const setNavContext = useProductNavStore((s) => s.setNavContext);
  useEffect(() => {
    if (allProducts.length > 0) {
      const slugs = allProducts.map((p) => p.slug);
      setNavContext(slugs, 'All Products', `/products?${searchParams.toString()}`);
    }
  }, [allProducts, searchParams, setNavContext]);

  const currentFilters: FilterState = { category, minPrice, maxPrice, size, color };
  const hasActiveFilters = !!(minPrice || maxPrice || size || color || category || activeMood);

  const clearAllFilters = () => {
    setActiveMood('');
    router.push('/products', { scroll: false });
  };

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{ backgroundColor: '#FFF', position: 'relative' }}
    >
      {/* ===== Sticky bottom layer: header + hero video ===== */}
      <div
        style={{
          position: 'sticky',
          top: 56,
          zIndex: 0,
          backgroundColor: '#FFF',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 16px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {search ? (
            <>
              <p style={{ fontSize: 10, fontWeight: 300, color: '#CCC', letterSpacing: 0.5 }}>
                Search results
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 300, color: '#000', letterSpacing: -0.5 }}>
                &ldquo;{search}&rdquo;
              </h1>
            </>
          ) : (
            <>
              <p style={{ fontSize: 10, fontWeight: 300, color: '#CCC', letterSpacing: 0.5 }}>
                Home / Products
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 300, color: '#000', letterSpacing: -0.5 }}>
                All Products
              </h1>
            </>
          )}
          <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
            {totalCount} PRODUCTS
          </span>
        </div>

        {/* Hero banner — video background with vacation tagline overlaid */}
        {!search && (
          <div
            style={{
              position: 'relative',
              height: 220,
              backgroundColor: '#EDE8DF',
              padding: '0 28px 24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              gap: 8,
              overflow: 'hidden',
            }}
          >
            {/* Background video */}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 0,
              }}
            >
              <source
                src="https://pahlcltpwzsqdclizdtl.supabase.co/storage/v1/object/public/product-videos/showcase/hero-showcase.mp4"
                type="video/mp4"
              />
            </video>
            {/* Dark gradient for text legibility */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 100%)',
                zIndex: 1,
              }}
            />
            <p
              style={{
                position: 'relative',
                zIndex: 2,
                fontSize: 20,
                fontWeight: 300,
                color: '#FFF',
                letterSpacing: -0.3,
                lineHeight: 1.35,
              }}
            >
              {'Pack light, look effortless.\nMade for warm days ahead.'}
            </p>
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                gap: 20,
                alignItems: 'center',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Wind size={11} color="rgba(255,255,255,0.75)" />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: 0.3,
                  }}
                >
                  Breathable
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Luggage size={11} color="rgba(255,255,255,0.75)" />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: 0.3,
                  }}
                >
                  Travel-ready
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sun size={11} color="rgba(255,255,255,0.75)" />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.75)',
                    letterSpacing: 0.3,
                  }}
                >
                  Sun-washed tones
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
      {/* ===== end sticky bottom layer ===== */}

      {/* ===== Content overlay: rounded top 16, marginTop -16, zIndex 1, scrolls over sticky hero ===== */}
      <motion.div
        initial={{ y: 16 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: -16,
          backgroundColor: '#FFF',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        {/* Mood circles — instant client-side filter */}
        {!search && (
          <div
            style={{
              height: 100,
              padding: '16px 8px 10px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              gap: 0,
            }}
          >
            {[
              { label: 'Beach', value: 'beach', img: '/moods/beach.webp' },
              { label: 'Brunch', value: 'brunch', img: '/moods/brunch.webp' },
              { label: 'Sunset', value: 'sunset', img: '/moods/sunset.webp' },
              { label: 'Poolside', value: 'poolside', img: '/moods/poolside.webp' },
              { label: 'Island', value: 'island', img: '/moods/island.webp' },
            ].map((m) => {
              const isActive = activeMood === m.value;
              return (
                <button
                  key={m.label}
                  onClick={() => setActiveMood(isActive ? '' : m.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 9999,
                      backgroundImage: `url(${m.img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      outline: isActive ? '2px solid #000' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                  <span style={{ fontSize: 9, fontWeight: isActive ? 400 : 300, color: '#000' }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

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
            {activeMood && (
              <button
                onClick={() => setActiveMood('')}
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
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: '#000',
                    letterSpacing: 0.5,
                    textTransform: 'capitalize',
                  }}
                >
                  {activeMood}
                </span>
                <X size={10} color="#999" />
              </button>
            )}
            {category && (
              <button
                onClick={() => updateParams({ category: undefined })}
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
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    color: '#000',
                    letterSpacing: 0.5,
                    textTransform: 'capitalize',
                  }}
                >
                  {category}
                </span>
                <X size={10} color="#999" />
              </button>
            )}
            {size && (
              <button
                onClick={() => updateParams({ size: undefined })}
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
                onClick={() => updateParams({ minPrice: undefined, maxPrice: undefined })}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 14px' }}>
              {allProducts.map((product, i) => {
                const items = [];
                items.push(<ProductCard key={product.id} product={product} index={i} />);
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

            {/* Trust strip */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0 0 0' }}
            >
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
      </motion.div>
      {/* ===== end content overlay ===== */}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  );
}
