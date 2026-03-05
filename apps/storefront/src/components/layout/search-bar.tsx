"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api-client";

interface SearchBarProps {
  onClose: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const data = await api.get(`/search/autocomplete?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch {
        // ignore
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="border-t border-light-gray bg-white px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <Search size={20} className="text-medium-gray shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, categories..."
            className="flex-1 bg-transparent outline-none text-charcoal placeholder:text-medium-gray"
          />
          <button type="button" onClick={onClose} className="p-1 text-medium-gray hover:text-charcoal">
            <X size={20} />
          </button>
        </form>

        {results && (results.products?.length > 0 || results.categories?.length > 0) && (
          <div className="mt-3 border-t border-light-gray pt-3 space-y-3">
            {results.categories?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-1">Categories</p>
                {results.categories.map((cat: any) => (
                  <a
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    onClick={onClose}
                    className="block py-1.5 text-sm text-charcoal hover:text-forest-green"
                  >
                    {cat.name}
                  </a>
                ))}
              </div>
            )}
            {results.products?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-1">Products</p>
                {results.products.map((product: any) => (
                  <a
                    key={product.slug}
                    href={`/products/${product.slug}`}
                    onClick={onClose}
                    className="block py-1.5 text-sm text-charcoal hover:text-forest-green"
                  >
                    {product.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
