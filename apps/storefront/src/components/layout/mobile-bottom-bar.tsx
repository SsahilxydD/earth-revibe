'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Heart, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useUiStore, subscribeDockHidden } from '@/stores/ui-store';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Search', href: '#search', icon: Search },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { label: 'Cart', href: '#cart', icon: ShoppingBag },
] as const;

export function MobileBottomBar() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);
  const { openSearch } = useUiStore();
  const [footerInView, setFooterInView] = useState(false);
  const [dockHidden, setDockHidden] = useState(false);

  // Subscribe to programmatic dock-hide requests (e.g. QuickAddModal opens —
  // the dock overlaps the add-to-cart button, so the modal pushes it away
  // for the duration of its open state).
  useEffect(() => subscribeDockHidden(setDockHidden), []);

  // Hide on product detail pages — the top header handles nav there
  const isProductDetail = pathname.startsWith('/products/') && pathname !== '/products';

  // Watch the footer: when any part of it enters the viewport, slide the dock out.
  useEffect(() => {
    if (isProductDetail) return;
    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting), {
      rootMargin: '0px 0px 0px 0px',
      threshold: 0,
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [isProductDetail, pathname]);

  if (isProductDetail) return null;

  return (
    <AnimatePresence>
      {!footerInView && !dockHidden && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <nav className="flex items-center justify-around px-2 py-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === pathname;
              const Icon = item.icon;

              if (item.href === '#search') {
                return (
                  <button
                    key={item.label}
                    onClick={openSearch}
                    className="flex flex-col items-center gap-0.5 px-3 py-1"
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5 text-[var(--color-muted)]" />
                    <span className="text-[10px] text-[var(--color-muted)]">{item.label}</span>
                  </button>
                );
              }

              if (item.href === '#cart') {
                return (
                  <button
                    key={item.label}
                    onClick={openCart}
                    className="relative flex flex-col items-center gap-0.5 px-3 py-1"
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5 text-[var(--color-muted)]" />
                    {itemCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[9px] font-bold text-white">
                        {itemCount > 99 ? '99+' : itemCount}
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--color-muted)]">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-1"
                  aria-label={item.label}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px]',
                      isActive
                        ? 'font-semibold text-[var(--color-primary)]'
                        : 'text-[var(--color-muted)]'
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-[var(--color-primary)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
