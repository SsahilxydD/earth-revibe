"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Search", href: "#search", icon: Search },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Cart", href: "#cart", icon: ShoppingBag },
] as const;

export function MobileBottomBar() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.getItemCount());
  const openCart = useCartStore((s) => s.openCart);
  const { openSearch } = useUiStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white md:hidden">
      <nav className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === pathname;
          const Icon = item.icon;

          if (item.href === "#search") {
            return (
              <button
                key={item.label}
                onClick={openSearch}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
                aria-label={item.label}
              >
                <Icon className="h-5 w-5 text-[var(--color-muted)]" />
                <span className="text-[10px] text-[var(--color-muted)]">
                  {item.label}
                </span>
              </button>
            );
          }

          if (item.href === "#cart") {
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
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-muted)]">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
              aria-label={item.label}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted)]"
                )}
              />
              <span
                className={cn(
                  "text-[10px]",
                  isActive
                    ? "font-semibold text-[var(--color-primary)]"
                    : "text-[var(--color-muted)]"
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

      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
