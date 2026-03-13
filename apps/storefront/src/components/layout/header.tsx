"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, Search, Heart, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";
import { SearchOverlay } from "./search-overlay";

const NAV_LINKS = [
  { label: "NEW ARRIVALS", href: "/categories/new-arrivals" },
  { label: "SHIRTS", href: "/categories/shirts" },
  { label: "T-SHIRTS", href: "/categories/t-shirts" },
  { label: "OUTERWEAR", href: "/categories/outerwear" },
  { label: "ALL PRODUCTS", href: "/products" },
  { label: "BESTSELLERS", href: "/categories/bestsellers" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { openMobileMenu } = useUiStore();
  const { isSearchOpen, openSearch } = useUiStore();
  const itemCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full bg-white transition-all duration-300",
          scrolled && "shadow-md"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between px-4 transition-all duration-300 md:px-8 lg:px-12 xl:px-20",
            scrolled ? "py-2" : "py-3"
          )}
        >
          {/* Left: hamburger (mobile) + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={openMobileMenu}
              className="flex h-10 w-10 items-center justify-center lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="flex items-center">
              <span
                className={cn(
                  "font-bold uppercase tracking-[0.2em] transition-all duration-300",
                  scrolled ? "text-lg" : "text-xl"
                )}
              >
                Earth Revibe
              </span>
            </Link>
          </div>

          {/* Center: desktop nav */}
          <nav className="hidden lg:flex lg:items-center lg:gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-text)] transition-colors hover:text-[var(--color-muted)]",
                  link.label === "SALE" && "text-[var(--color-sale)]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={openSearch}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/account/wishlist"
              className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface)] transition-colors sm:flex"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <button
              onClick={openCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      {isSearchOpen && <SearchOverlay />}
    </>
  );
}
