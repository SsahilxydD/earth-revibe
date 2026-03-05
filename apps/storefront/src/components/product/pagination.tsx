"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  // Always show first page
  pages.push(1);

  if (current <= 3) {
    // Near the beginning
    pages.push(2, 3, 4, "...", total);
  } else if (current >= total - 2) {
    // Near the end
    pages.push("...", total - 3, total - 2, total - 1, total);
  } else {
    // In the middle
    pages.push("...", current - 1, current, current + 1, "...", total);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-10"
      aria-label="Pagination"
    >
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-light-gray text-charcoal hover:border-sage hover:text-forest-green disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-light-gray disabled:hover:text-charcoal transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) => {
        if (page === "...") {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="flex items-center justify-center w-9 h-9 text-sm text-medium-gray"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isActive}
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-forest-green text-white"
                : "border border-light-gray text-charcoal hover:border-sage hover:text-forest-green"
            }`}
            aria-label={`Page ${page}`}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </button>
        );
      })}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-light-gray text-charcoal hover:border-sage hover:text-forest-green disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-light-gray disabled:hover:text-charcoal transition-colors"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
