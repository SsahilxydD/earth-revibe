'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortOption {
  label: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Price: Low to High', sortBy: 'price', sortOrder: 'asc' },
  { label: 'Price: High to Low', sortBy: 'price', sortOrder: 'desc' },
  { label: 'Most Popular', sortBy: 'reviewCount', sortOrder: 'desc' },
];

interface SortDropdownProps {
  currentSort: string;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export function SortDropdown({ currentSort, onSortChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption =
    SORT_OPTIONS.find((opt) => `${opt.sortBy}-${opt.sortOrder}` === currentSort) || SORT_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 border border-[var(--color-border)] px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--color-text)]"
      >
        <span>Sort: {selectedOption.label}</span>
        <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="animate-slide-down absolute right-0 top-full z-30 mt-1 min-w-[200px] border border-[var(--color-border)] bg-white shadow-lg">
          {SORT_OPTIONS.map((option) => {
            const value = `${option.sortBy}-${option.sortOrder}`;
            const isSelected = value === `${selectedOption.sortBy}-${selectedOption.sortOrder}`;
            return (
              <button
                key={value}
                onClick={() => {
                  onSortChange(option.sortBy, option.sortOrder);
                  setIsOpen(false);
                }}
                className={cn(
                  'block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-surface)]',
                  isSelected && 'font-semibold'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
