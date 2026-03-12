"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, X, Clock, ArrowRight } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { api } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

const RECENT_SEARCHES_KEY = "earth-revibe-recent-searches";
const MAX_RECENT = 5;

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
}

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const recent = getRecentSearches().filter(
    (s) => s.toLowerCase() !== query.toLowerCase()
  );
  const updated = [query, ...recent].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export function SearchOverlay() {
  const { closeSearch } = useUiStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setRecentSearches(getRecentSearches());
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<{ products: SearchResult[] }>(
        `/search?q=${encodeURIComponent(searchQuery)}&limit=6`
      );
      setResults(data.products || []);
    } catch {
      setResults([]);
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
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={closeSearch}
      />
      <div className="absolute left-0 right-0 top-0 bg-white animate-slide-down shadow-xl">
        <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8">
          {/* Search input */}
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search for products..."
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

          {/* Results / Recent */}
          <div className="mt-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            )}

            {!loading && results.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Products
                </p>
                <ul className="divide-y divide-[var(--color-border)]">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={() => {
                          saveRecentSearch(query);
                          closeSearch();
                        }}
                        className="flex items-center gap-4 py-3 transition-colors hover:bg-[var(--color-surface)] px-2 rounded"
                      >
                        {product.image && (
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-[var(--color-surface)]">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {product.name}
                          </p>
                          <p className="text-sm text-[var(--color-muted)]">
                            {"\u20B9"}
                            {product.price.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                No products found for &ldquo;{query}&rdquo;
              </p>
            )}

            {!loading && query.length < 2 && recentSearches.length > 0 && (
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
          </div>
        </div>
      </div>
    </div>
  );
}
