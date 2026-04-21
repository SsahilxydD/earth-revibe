'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useUiStore } from '@/stores/ui-store';
import { SearchOverlay } from './search-overlay';

const NAV_LINKS = [
  { label: 'ALL', href: '/products' },
  { label: 'SHIRTS', href: '/products?category=shirts' },
  { label: 'POLOS', href: '/products?category=polos' },
  { label: 'T-SHIRTS', href: '/products?category=t-shirts' },
  { label: 'BOTTOMWEAR', href: '/products?category=bottomwear' },
  { label: 'OFFERS', href: '/offers' },
];

export function Header() {
  const { isSearchOpen, openSearch } = useUiStore();
  const itemCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);
  const pathname = usePathname();

  // Initialize from current scroll position to avoid wrong state on first frame
  const [scrolled, setScrolled] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY > 10 : false
  );

  const isProductDetail = pathname.startsWith('/products/') && pathname !== '/products';

  const updateScrolled = useCallback(() => {
    setScrolled(window.scrollY > 10);
  }, []);

  useEffect(() => {
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }, [updateScrolled]);

  return (
    <>
      {/* ------------------------------------------------------------ */}
      {/* Solid header                                                  */}
      {/* Mobile: product detail (back+icons) / other pages (logo only) */}
      {/* Desktop: always full nav                                      */}
      {/* ------------------------------------------------------------ */}
      <header
        className={cn(
          'sticky top-0 z-40 w-full bg-white transition-all duration-300',
          scrolled && 'shadow-md'
        )}
      >
        <div
          className={cn(
            'grid grid-cols-3 items-center px-4 transition-all duration-300 md:px-8 lg:px-12 xl:px-20',
            scrolled ? 'py-2' : 'py-3'
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
                className={cn('h-auto transition-all duration-300', scrolled ? 'w-9' : 'w-11')}
              />
            </Link>
          </div>

          {/* Right icons. Cart is always visible (the dock no longer carries it).
              Search + wishlist remain desktop-only — search is in the mobile dock,
              wishlist is accessible via /account/wishlist from the Account tab. */}
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={openSearch}
              className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface)] transition-colors md:flex"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link
              href="/account/wishlist"
              className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface)] transition-colors md:flex"
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
                  {itemCount > 99 ? '99+' : itemCount}
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
                'text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-text)] transition-colors hover:text-[var(--color-muted)]',
                link.label === 'SALE' && 'text-[var(--color-sale)]'
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
