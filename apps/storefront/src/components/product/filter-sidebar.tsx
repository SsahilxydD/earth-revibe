"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategories } from "@/hooks/use-products";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const COLOR_OPTIONS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#cf2929" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#16a34a" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Brown", hex: "#92400e" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Navy", hex: "#1e3a5f" },
] as const;

const PRICE_RANGES = [
  { label: "Under Rs.500", min: 0, max: 500 },
  { label: "Rs.500 - Rs.1,000", min: 500, max: 1000 },
  { label: "Rs.1,000 - Rs.2,000", min: 1000, max: 2000 },
  { label: "Rs.2,000 - Rs.5,000", min: 2000, max: 5000 },
  { label: "Above Rs.5,000", min: 5000, max: undefined },
] as const;

export interface FilterState {
  category: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  size: string;
  color: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

function FilterContent({ filters, onFilterChange }: FilterSidebarProps) {
  const { data: categories } = useCategories();

  const hasActiveFilters =
    filters.category ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.size ||
    filters.color;

  const clearAll = () => {
    onFilterChange({
      category: "",
      minPrice: undefined,
      maxPrice: undefined,
      size: "",
      color: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-[var(--color-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-text)]"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Category
          </h4>
          <div className="space-y-2">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={filters.category === cat.slug}
                  onChange={() =>
                    onFilterChange({
                      ...filters,
                      category: filters.category === cat.slug ? "" : cat.slug,
                    })
                  }
                  className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                />
                <span>{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Price
        </h4>
        <div className="space-y-2">
          {PRICE_RANGES.map((range) => {
            const isSelected =
              filters.minPrice === range.min && filters.maxPrice === range.max;
            return (
              <label
                key={range.label}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    onFilterChange({
                      ...filters,
                      minPrice: isSelected ? undefined : range.min,
                      maxPrice: isSelected ? undefined : range.max,
                    })
                  }
                  className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                />
                <span>{range.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Size */}
      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Size
        </h4>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => {
            const isSelected = filters.size === size;
            return (
              <button
                key={size}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    size: isSelected ? "" : size,
                  })
                }
                className={cn(
                  "flex h-9 min-w-[3rem] items-center justify-center border px-3 text-xs font-semibold transition-colors",
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color */}
      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Color
        </h4>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => {
            const isSelected = filters.color === color.name;
            return (
              <button
                key={color.name}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    color: isSelected ? "" : color.name,
                  })
                }
                title={color.name}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all",
                  isSelected
                    ? "ring-2 ring-[var(--color-primary)] ring-offset-2"
                    : "border-[var(--color-border)] hover:scale-110",
                  color.name === "White" && "border-gray-300"
                )}
                style={{ backgroundColor: color.hex }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile filter button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="flex items-center gap-1.5 border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--color-text)] lg:hidden"
      >
        <SlidersHorizontal size={14} />
        Filters
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-[240px] shrink-0 lg:block">
        <div className="sticky top-24">
          <FilterContent filters={filters} onFilterChange={onFilterChange} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 top-0 w-[300px] max-w-[85vw] animate-slide-in-left overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-bold uppercase tracking-wider">
                Filters
              </h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>
            <FilterContent filters={filters} onFilterChange={onFilterChange} />
            <div className="mt-8">
              <button
                onClick={() => setIsMobileOpen(false)}
                className="w-full bg-[var(--color-primary)] py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
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
