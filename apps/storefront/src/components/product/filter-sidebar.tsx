'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

const COLOR_OPTIONS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Yellow', hex: '#CA8A04' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Gray', hex: '#78716C' },
  { name: 'Navy', hex: '#1E3A5F' },
] as const;

const PRICE_RANGES = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 — ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 — ₹2,000', min: 1000, max: 2000 },
  { label: '₹2,000 — ₹5,000', min: 2000, max: 5000 },
  { label: 'Above ₹5,000', min: 5000, max: undefined },
] as const;

export interface FilterState {
  minPrice: number | undefined;
  maxPrice: number | undefined;
  size: string;
  color: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isOpen]);

  const hasActiveFilters = !!(
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.size ||
    filters.color
  );

  const clearAll = () => {
    onFilterChange({
      minPrice: undefined,
      maxPrice: undefined,
      size: '',
      color: '',
    });
  };

  return (
    <>
      {/* Trigger button — matches filter bar */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <SlidersHorizontal size={14} color="#000" />
        <span style={{ fontSize: 11, fontWeight: 400, color: '#000', letterSpacing: 0.5 }}>
          Filters
        </span>
      </button>

      {/* Full-screen drawer */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          {/* Backdrop */}
          <div
            className="animate-fade-in"
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer — full height, left side */}
          <div
            className="animate-slide-in-left font-[family-name:var(--font-inter)]"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 393,
              backgroundColor: '#FAF7F0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Top — header + filter sections */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Header — 56px */}
              <div
                style={{
                  height: 56,
                  padding: '0 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 400, color: '#000', letterSpacing: 2 }}>
                  FILTERS
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#999',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

              {/* Filter sections — padding 24/28, gap 28 */}
              <div
                style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}
              >
                {/* Price */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span
                    style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}
                  >
                    PRICE
                  </span>
                  {PRICE_RANGES.map((range) => {
                    const isSelected =
                      filters.minPrice === range.min && filters.maxPrice === range.max;
                    return (
                      <button
                        key={range.label}
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            minPrice: isSelected ? undefined : range.min,
                            maxPrice: isSelected ? undefined : range.max,
                          })
                        }
                        style={{
                          textAlign: 'left',
                          fontSize: 13,
                          fontWeight: isSelected ? 400 : 300,
                          color: '#000',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>

                {/* Size — 40x36 buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span
                    style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}
                  >
                    SIZE
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {SIZES.map((size) => {
                      const isSelected = filters.size === size;
                      return (
                        <button
                          key={size}
                          onClick={() =>
                            onFilterChange({ ...filters, size: isSelected ? '' : size })
                          }
                          style={{
                            width: 40,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: isSelected ? 400 : 300,
                            color: isSelected ? '#FFF' : '#000',
                            backgroundColor: isSelected ? '#000' : 'transparent',
                            border: isSelected ? 'none' : '1px solid #E5E5E5',
                            cursor: 'pointer',
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color — 28px circles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span
                    style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}
                  >
                    COLOR
                  </span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {COLOR_OPTIONS.map((color) => {
                      const isSelected = filters.color === color.name;
                      return (
                        <button
                          key={color.name}
                          onClick={() =>
                            onFilterChange({ ...filters, color: isSelected ? '' : color.name })
                          }
                          title={color.name}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 9999,
                            backgroundColor: color.hex,
                            border:
                              color.name === 'White'
                                ? '1px solid #E5E5E5'
                                : isSelected
                                  ? '2px solid #000'
                                  : 'none',
                            cursor: 'pointer',
                            outline:
                              isSelected && color.name !== 'White' ? '2px solid #000' : 'none',
                            outlineOffset: 2,
                            padding: 0,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom — APPLY FILTERS button */}
            <div style={{ padding: '20px 28px 28px 28px' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: '100%',
                  height: 50,
                  backgroundColor: '#000',
                  color: '#FFF',
                  fontSize: 12,
                  fontWeight: 400,
                  letterSpacing: 2,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                APPLY FILTERS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
