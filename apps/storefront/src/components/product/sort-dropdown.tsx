"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { label: "Newest", value: "createdAt-desc" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Name: A-Z", value: "name-asc" },
] as const;

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    SORT_OPTIONS.find((opt) => opt.value === value)?.label || "Newest";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-light-gray rounded-lg text-sm bg-white hover:border-sage transition-colors"
      >
        <span className="text-medium-gray">Sort:</span>
        <span className="text-charcoal font-medium">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`text-medium-gray transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-light-gray rounded-lg shadow-lg z-20 py-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-off-white transition-colors ${
                value === option.value
                  ? "text-forest-green font-medium bg-off-white"
                  : "text-charcoal"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
