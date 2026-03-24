"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ChevronDown, Instagram, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore, lockBodyScroll, unlockBodyScroll } from "@/stores/ui-store";

interface NavSection {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "NEW ARRIVALS",
    href: "/categories/new-arrivals",
  },
  {
    label: "SHIRTS",
    href: "/categories/shirts",
  },
  {
    label: "T-SHIRTS",
    href: "/categories/t-shirts",
  },
  {
    label: "OUTERWEAR",
    href: "/categories/outerwear",
  },
  {
    label: "ALL PRODUCTS",
    href: "/products",
  },
  {
    label: "BESTSELLERS",
    href: "/categories/bestsellers",
  },
];

export function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUiStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (isMobileMenuOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isMobileMenuOpen]);

  const toggleSection = (label: string) => {
    setExpandedSection((prev) => (prev === label ? null : label));
  };

  const handleLinkClick = () => {
    closeMobileMenu();
    setExpandedSection(null);
  };

  if (!isMobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={closeMobileMenu}
      />

      {/* Panel */}
      <div className="absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-white shadow-2xl animate-slide-in-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <span className="text-lg font-bold uppercase tracking-[0.2em]">
            Menu
          </span>
          <button
            onClick={closeMobileMenu}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface)]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto hide-scrollbar">
          <ul className="divide-y divide-[var(--color-border)]">
            {NAV_SECTIONS.map((section) => (
              <li key={section.label}>
                {section.children ? (
                  <div>
                    <button
                      onClick={() => toggleSection(section.label)}
                      className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold uppercase tracking-wider"
                    >
                      <span
                        className={cn(
                          section.label === "SALE" &&
                            "text-[var(--color-sale)]"
                        )}
                      >
                        {section.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          expandedSection === section.label && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedSection === section.label && (
                      <ul className="animate-slide-down bg-[var(--color-surface)] pb-2">
                        {section.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={handleLinkClick}
                              className="block px-8 py-2.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={section.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "block px-5 py-4 text-sm font-semibold uppercase tracking-wider",
                      section.label === "SALE" && "text-[var(--color-sale)]"
                    )}
                  >
                    {section.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Social links */}
        <div className="border-t border-[var(--color-border)] px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Follow Us
          </p>
          <div className="flex gap-4">
            <a
              href="https://instagram.com/earthrevibe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://twitter.com/earthrevibe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
