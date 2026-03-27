'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, ArrowRight, Grid3X3, Sparkles, Shirt } from 'lucide-react';
import { useUiStore, lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';
import { api } from '@/lib/api-client';
import { Spinner } from '@/components/ui/spinner';

const RECENT_SEARCHES_KEY = 'earth-revibe-recent-searches';
const MAX_RECENT = 5;

/* ------------------------------------------------------------------ */
/*  Category quick-links (shown when search is empty — replaces        */
/*  hamburger menu navigation)                                         */
/* ------------------------------------------------------------------ */
const BROWSE_CATEGORIES = [
  { label: 'New Arrivals', href: '/categories/new-arrivals', icon: Sparkles },
  { label: 'Bestsellers', href: '/categories/bestsellers', icon: Sparkles },
  { label: 'All Products', href: '/products', icon: Grid3X3 },
  { label: 'T-Shirts', href: '/categories/t-shirts', icon: Shirt },
  { label: 'Shirts', href: '/categories/shirts', icon: Shirt },
  { label: 'Polos', href: '/categories/polos', icon: Shirt },
  { label: 'Bottomwear', href: '/categories/bottomwear', icon: Shirt },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AutocompleteResult {
  products: {
    name: string;
    slug: string;
    price: number;
    images?: { url: string }[];
  }[];
  categories: {
    name: string;
    slug: string;
  }[];
  blogPosts?: {
    title: string;
    slug: string;
  }[];
}

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase());
  const updated = [query, ...recent].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export function SearchOverlay() {
  const { closeSearch } = useUiStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setRecentSearches(getRecentSearches());
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeSearch]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<AutocompleteResult>(
        `/search/autocomplete?q=${encodeURIComponent(searchQuery)}`
      );
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      closeSearch();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const hasProducts = results && results.products.length > 0;
  const hasCategories = results && results.categories.length > 0;
  const hasResults = hasProducts || hasCategories;
  const showEmpty = !loading && query.length < 2;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={closeSearch} />
      <div className="absolute left-0 right-0 top-0 bg-white animate-slide-down shadow-xl">
        <div className="px-4 py-6 md:px-8 lg:px-12 xl:px-20">
          {/* Search input */}
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search products, categories..."
              className="w-full border-b-2 border-[var(--color-primary)] bg-transparent py-4 pl-12 pr-12 text-lg outline-none placeholder:text-[var(--color-muted)]"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-[var(--color-surface)]"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </form>

          {/* Results / Recommendations */}
          <div className="mt-4 max-h-[70vh] overflow-y-auto hide-scrollbar">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            )}

            {/* ---- Search results: categories ---- */}
            {!loading && hasCategories && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {results!.categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categories/${cat.slug}`}
                      onClick={() => {
                        saveRecentSearch(query);
                        closeSearch();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)]"
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ---- Search results: products ---- */}
            {!loading && hasProducts && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Products
                </p>
                <ul className="divide-y divide-[var(--color-border)]">
                  {results!.products.map((product) => (
                    <li key={product.slug}>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={() => {
                          saveRecentSearch(query);
                          closeSearch();
                        }}
                        className="flex items-center gap-4 py-3 transition-colors hover:bg-[var(--color-surface)] px-2 rounded"
                      >
                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-[var(--color-surface)]">
                          <Image
                            src={product.images?.[0]?.url || '/placeholder.png'}
                            alt={product.name}
                            fill
                            quality={35}
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-sm text-[var(--color-muted)]">
                            {'\u20B9'}
                            {product.price.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---- No results ---- */}
            {!loading && query.length >= 2 && !hasResults && (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                No results found for &ldquo;{query}&rdquo;
              </p>
            )}

            {/* ---- Empty state: browse categories + recent searches ---- */}
            {showEmpty && (
              <>
                {/* Browse categories — replaces hamburger menu */}
                <div className="mb-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Browse
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {BROWSE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={closeSearch}
                          className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-3 text-sm font-medium transition-colors hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]"
                        >
                          <Icon className="h-4 w-4 text-[var(--color-muted)]" />
                          {cat.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Recent Searches
                    </p>
                    <ul className="space-y-1">
                      {recentSearches.map((term) => (
                        <li key={term}>
                          <button
                            onClick={() => handleRecentClick(term)}
                            className="flex w-full items-center gap-3 rounded px-2 py-2 text-sm transition-colors hover:bg-[var(--color-surface)]"
                          >
                            <Clock className="h-4 w-4 text-[var(--color-muted)]" />
                            <span>{term}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
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
