"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Heart, ShoppingBag, ArrowLeft } from "lucide-react";
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
  const [logoTop, setLogoTop] = useState(0);
  const { isSearchOpen, openSearch, announcementDismissed } = useUiStore();
  const itemCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);
  const pathname = usePathname();
  const bannerHeightRef = useRef(0);

  const isProductDetail =
    pathname.startsWith("/products/") && pathname !== "/products";
  const isHomepage = pathname === "/";

  // Single scroll + resize handler that computes both scrolled state
  // and the transparent logo's top offset (stays below the banner
  // while visible, then locks to top: 0 once the banner scrolls away)
  const updatePositions = useCallback(() => {
    const scrollY = window.scrollY;
    setScrolled(scrollY > 10);

    if (announcementDismissed) {
      setLogoTop(0);
      return;
    }

    // Re-measure banner each time (cheap DOM read, handles dynamic content)
    const banner = document.querySelector("[data-announcement-bar]");
    bannerHeightRef.current = banner
      ? banner.getBoundingClientRect().height + banner.getBoundingClientRect().top - 0
      : 0;

    // Banner is in normal flow — as the page scrolls, it moves up.
    // The logo should sit right below the banner's visible bottom edge,
    // but never go below 0 (when banner has scrolled fully out).
    const visibleBannerBottom = Math.max(0, bannerHeightRef.current);
    setLogoTop(visibleBannerBottom);
  }, [announcementDismissed]);

  useEffect(() => {
    updatePositions();
    window.addEventListener("scroll", updatePositions, { passive: true });
    window.addEventListener("resize", updatePositions);
    return () => {
      window.removeEventListener("scroll", updatePositions);
      window.removeEventListener("resize", updatePositions);
    };
  }, [updatePositions]);

  return (
    <>
      {/* ------------------------------------------------------------ */}
      {/* Mobile transparent navbar — non-product-detail pages only     */}
      {/* Fixed overlay that floats over page content. Tracks the       */}
      {/* announcement banner: sits below it when visible, slides up    */}
      {/* to top:0 as the banner scrolls out of view.                   */}
      {/* ------------------------------------------------------------ */}
      {isHomepage && (
        <div
          className="fixed left-0 right-0 z-30 pointer-events-none md:hidden"
          style={{ top: logoTop }}
        >
          <div className="flex items-center justify-center px-4 py-3 pointer-events-auto">
            <Link href="/">
              <Image
                src="/Earth Revibe Logo White.png"
                alt="Earth Revibe"
                width={160}
                height={40}
                priority
                className="h-auto w-10 drop-shadow-md"
              />
            </Link>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Solid header                                                  */}
      {/* Mobile: product detail (back+icons) / other pages (logo only) */}
      {/* Desktop: always full nav                                      */}
      {/* Homepage mobile: hidden (transparent logo above handles it)   */}
      {/* ------------------------------------------------------------ */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full bg-white transition-all duration-300",
          scrolled && "shadow-md",
          isHomepage && "hidden md:block"
        )}
      >
        <div
          className={cn(
            "grid grid-cols-3 items-center px-4 transition-all duration-300 md:px-8 lg:px-12 xl:px-20",
            scrolled ? "py-2" : "py-3"
          )}
        >
          <div className="flex items-center">
            {isProductDetail && (
              <button
                onClick={() => window.history.back()}
                className="flex h-10 w-10 items-center justify-center lg:hidden"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex justify-center">
            <Link href="/">
              <Image
                src="/Earth Revibe Logo Black.png"
                alt="Earth Revibe"
                width={160}
                height={40}
                priority
                className={cn(
                  "h-auto transition-all duration-300",
                  scrolled ? "w-9" : "w-11"
                )}
              />
            </Link>
          </div>

          {/* Right icons: always on desktop, only on product detail mobile */}
          {/* Other mobile pages use the bottom dock for search/cart */}
          <div className={cn(
            "flex items-center justify-end gap-1",
            !isProductDetail && "hidden md:flex"
          )}>
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

        <nav className="hidden border-t border-[var(--color-border)] lg:flex lg:items-center lg:justify-center lg:gap-8 lg:px-4 lg:py-2">
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
      </header>
      {isSearchOpen && <SearchOverlay />}
    </>
  );
}
