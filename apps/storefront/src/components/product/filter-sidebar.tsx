"use client";

import { useState, useEffect } from "react";
import { PRODUCT_SIZES, PRODUCT_COLORS } from "@earth-revibe/shared";
import { useUIStore } from "@/stores/ui-store";

const MATERIALS = ["Organic Cotton", "Linen", "Hemp", "Recycled"] as const;

interface FilterSidebarProps {
  onFilterChange: (updates: Record<string, string | undefined>) => void;
  currentFilters: Record<string, string | undefined>;
  categories?: { name: string; slug: string }[];
}

interface FilterState {
  categories: string[];
  sizes: string[];
  colors: string[];
  materials: string[];
  minPrice: string;
  maxPrice: string;
}

function parseMultiValue(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function FilterSidebar({
  onFilterChange,
  currentFilters,
  categories = [],
}: FilterSidebarProps) {
  const { isFilterDrawerOpen, setFilterDrawerOpen } = useUIStore();

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["size", "color", "price", "material"])
  );

  function toggleSection(section: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  const [filters, setFilters] = useState<FilterState>({
    categories: parseMultiValue(currentFilters.category),
    sizes: parseMultiValue(currentFilters.size),
    colors: parseMultiValue(currentFilters.color),
    materials: parseMultiValue(currentFilters.material),
    minPrice: currentFilters.minPrice || "",
    maxPrice: currentFilters.maxPrice || "",
  });

  useEffect(() => {
    setFilters({
      categories: parseMultiValue(currentFilters.category),
      sizes: parseMultiValue(currentFilters.size),
      colors: parseMultiValue(currentFilters.color),
      materials: parseMultiValue(currentFilters.material),
      minPrice: currentFilters.minPrice || "",
      maxPrice: currentFilters.maxPrice || "",
    });
  }, [currentFilters]);

  function toggleArrayValue(arr: string[], value: string): string[] {
    return arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
  }

  function applyFilters(updated: Partial<FilterState>) {
    const merged = { ...filters, ...updated };
    setFilters(merged);

    onFilterChange({
      category: merged.categories.length
        ? merged.categories.join(",")
        : undefined,
      size: merged.sizes.length ? merged.sizes.join(",") : undefined,
      color: merged.colors.length ? merged.colors.join(",") : undefined,
      material: merged.materials.length
        ? merged.materials.join(",")
        : undefined,
      minPrice: merged.minPrice || undefined,
      maxPrice: merged.maxPrice || undefined,
    });
  }

  function clearAll() {
    const cleared: FilterState = {
      categories: [],
      sizes: [],
      colors: [],
      materials: [],
      minPrice: "",
      maxPrice: "",
    };
    setFilters(cleared);
    onFilterChange({
      category: undefined,
      size: undefined,
      color: undefined,
      material: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.materials.length > 0 ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "";

  const filterContent = (
    <div>
      {/* Clear all — only shown when filters are active */}
      {hasActiveFilters && (
        <div className="flex justify-end mb-2">
          <button
            onClick={clearAll}
            className="text-[10px] font-[var(--font-cinzel)] tracking-[0.08em] uppercase text-slate-500 hover:text-black transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="border-b border-slate-100">
          <button
            onClick={() => toggleSection("category")}
            className="text-[11px] font-medium tracking-[0.1em] uppercase text-slate-700 flex items-center justify-between w-full py-3 cursor-pointer"
          >
            Category
            <span className="text-slate-400 text-lg leading-none">
              {openSections.has("category") ? "−" : "+"}
            </span>
          </button>
          {openSections.has("category") && (
            <div className="pb-4">
              <div className="space-y-3">
                {categories.map((cat) => (
                  <label
                    key={cat.slug}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(cat.slug)}
                      onChange={() =>
                        applyFilters({
                          categories: toggleArrayValue(
                            filters.categories,
                            cat.slug
                          ),
                        })
                      }
                      className="w-3.5 h-3.5 border border-slate-300 text-black focus:ring-black accent-black"
                    />
                    <span className="text-[11px] text-slate-600 group-hover:text-black transition-colors">
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Size filter */}
      <div className="border-b border-slate-100">
        <button
          onClick={() => toggleSection("size")}
          className="text-[11px] font-medium tracking-[0.1em] uppercase text-slate-700 flex items-center justify-between w-full py-3 cursor-pointer"
        >
          Size
          <span className="text-slate-400 text-lg leading-none">
            {openSections.has("size") ? "−" : "+"}
          </span>
        </button>
        {openSections.has("size") && (
          <div className="pb-4">
            <div className="flex flex-wrap gap-2">
              {PRODUCT_SIZES.map((size) => {
                const isActive = filters.sizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() =>
                      applyFilters({
                        sizes: toggleArrayValue(filters.sizes, size),
                      })
                    }
                    className={`px-3 py-1 text-[10px] font-medium tracking-[0.06em] uppercase border transition-colors ${
                      isActive
                        ? "bg-black text-white border-black"
                        : "bg-white text-slate-600 border-slate-200 hover:border-black"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Color filter */}
      <div className="border-b border-slate-100">
        <button
          onClick={() => toggleSection("color")}
          className="text-[11px] font-medium tracking-[0.1em] uppercase text-slate-700 flex items-center justify-between w-full py-3 cursor-pointer"
        >
          Color
          <span className="text-slate-400 text-lg leading-none">
            {openSections.has("color") ? "−" : "+"}
          </span>
        </button>
        {openSections.has("color") && (
          <div className="pb-4">
            <div className="flex flex-wrap gap-2">
              {PRODUCT_COLORS.map((color) => {
                const isActive = filters.colors.includes(color.name);
                return (
                  <button
                    key={color.name}
                    onClick={() =>
                      applyFilters({
                        colors: toggleArrayValue(filters.colors, color.name),
                      })
                    }
                    className={`relative w-6 h-6 rounded-full border-2 transition-all ${
                      isActive
                        ? "border-black scale-110"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                    title={color.name}
                    aria-label={color.name}
                  >
                    <span
                      className="absolute inset-[2px] rounded-full"
                      style={{ backgroundColor: color.hex }}
                    />
                    {isActive && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          className={
                            color.hex === "#FFFFFF" || color.hex === "#FFFDD0"
                              ? "text-black"
                              : "text-white"
                          }
                        >
                          <path
                            d="M2 6L5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Price range */}
      <div className="border-b border-slate-100">
        <button
          onClick={() => toggleSection("price")}
          className="text-[11px] font-medium tracking-[0.1em] uppercase text-slate-700 flex items-center justify-between w-full py-3 cursor-pointer"
        >
          Price Range
          <span className="text-slate-400 text-lg leading-none">
            {openSections.has("price") ? "−" : "+"}
          </span>
        </button>
        {openSections.has("price") && (
          <div className="pb-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                  onBlur={() => applyFilters({ minPrice: filters.minPrice })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      applyFilters({ minPrice: filters.minPrice });
                  }}
                  className="w-full pl-7 pr-2 py-2.5 text-[11px] border border-slate-200 focus:outline-none focus:border-black bg-white transition-colors"
                />
              </div>
              <span className="text-slate-300 text-[11px]">—</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                  onBlur={() => applyFilters({ maxPrice: filters.maxPrice })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      applyFilters({ maxPrice: filters.maxPrice });
                  }}
                  className="w-full pl-7 pr-2 py-2.5 text-[11px] border border-slate-200 focus:outline-none focus:border-black bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Material filter */}
      <div className="border-b border-slate-100">
        <button
          onClick={() => toggleSection("material")}
          className="text-[11px] font-medium tracking-[0.1em] uppercase text-slate-700 flex items-center justify-between w-full py-3 cursor-pointer"
        >
          Material
          <span className="text-slate-400 text-lg leading-none">
            {openSections.has("material") ? "−" : "+"}
          </span>
        </button>
        {openSections.has("material") && (
          <div className="pb-4">
            <div className="space-y-3">
              {MATERIALS.map((material) => (
                <label
                  key={material}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={filters.materials.includes(material)}
                    onChange={() =>
                      applyFilters({
                        materials: toggleArrayValue(
                          filters.materials,
                          material
                        ),
                      })
                    }
                    className="w-3.5 h-3.5 border border-slate-300 text-black focus:ring-black accent-black"
                  />
                  <span className="text-[11px] text-slate-600 group-hover:text-black transition-colors">
                    {material}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block border-t border-slate-200 pt-4">{filterContent}</div>

      {/* Mobile drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setFilterDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white overflow-y-auto">
            <div className="p-6">
              {/* Close button */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.15em] uppercase text-slate-400">
                  Filters
                </h2>
                <button
                  onClick={() => setFilterDrawerOpen(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-50 transition-colors"
                  aria-label="Close filters"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {filterContent}

              {/* Apply button for mobile */}
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="w-full mt-8 py-3 bg-black text-white text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.15em] uppercase hover:bg-black/90 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
