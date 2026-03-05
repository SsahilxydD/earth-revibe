"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
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

  const [filters, setFilters] = useState<FilterState>({
    categories: parseMultiValue(currentFilters.category),
    sizes: parseMultiValue(currentFilters.size),
    colors: parseMultiValue(currentFilters.color),
    materials: parseMultiValue(currentFilters.material),
    minPrice: currentFilters.minPrice || "",
    maxPrice: currentFilters.maxPrice || "",
  });

  // Sync with URL changes
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
    <div className="space-y-6">
      {/* Header with clear */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-deep-earth">
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-terracotta hover:text-terracotta/80 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-charcoal mb-3">Category</h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <label
                key={cat.slug}
                className="flex items-center gap-2 cursor-pointer group"
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
                  className="w-4 h-4 rounded border-light-gray text-forest-green focus:ring-forest-green"
                />
                <span className="text-sm text-dark-gray group-hover:text-charcoal">
                  {cat.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Size filter */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3">Size</h3>
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
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  isActive
                    ? "bg-forest-green text-white border-forest-green"
                    : "bg-white text-charcoal border-light-gray hover:border-sage"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color filter */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3">Color</h3>
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
                className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                  isActive
                    ? "border-forest-green scale-110"
                    : "border-light-gray hover:border-sage"
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
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      className={
                        color.hex === "#FFFFFF" || color.hex === "#FFFDD0"
                          ? "text-charcoal"
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

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3">
          Price Range
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-medium-gray">
              ₹
            </span>
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              onBlur={() => applyFilters({ minPrice: filters.minPrice })}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters({ minPrice: filters.minPrice });
              }}
              className="w-full pl-6 pr-2 py-2 text-sm border border-light-gray rounded-lg focus:outline-none focus:border-sage bg-white"
            />
          </div>
          <span className="text-medium-gray text-sm">-</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-medium-gray">
              ₹
            </span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              onBlur={() => applyFilters({ maxPrice: filters.maxPrice })}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters({ maxPrice: filters.maxPrice });
              }}
              className="w-full pl-6 pr-2 py-2 text-sm border border-light-gray rounded-lg focus:outline-none focus:border-sage bg-white"
            />
          </div>
        </div>
      </div>

      {/* Material filter */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3">Material</h3>
        <div className="space-y-2">
          {MATERIALS.map((material) => (
            <label
              key={material}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.materials.includes(material)}
                onChange={() =>
                  applyFilters({
                    materials: toggleArrayValue(filters.materials, material),
                  })
                }
                className="w-4 h-4 rounded border-light-gray text-forest-green focus:ring-forest-green"
              />
              <span className="text-sm text-dark-gray group-hover:text-charcoal">
                {material}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{filterContent}</div>

      {/* Mobile drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setFilterDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-cream overflow-y-auto">
            <div className="p-6">
              {/* Close button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-heading font-semibold text-deep-earth">
                  Filters
                </h2>
                <button
                  onClick={() => setFilterDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-light-gray transition-colors"
                  aria-label="Close filters"
                >
                  <X size={18} />
                </button>
              </div>

              {filterContent}

              {/* Apply button for mobile */}
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="w-full mt-8 py-3 bg-forest-green text-white text-sm font-semibold rounded-lg hover:bg-forest-green/90 transition-colors"
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
