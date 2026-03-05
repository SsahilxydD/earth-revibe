"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";

const tabs = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/products", icon: Grid3X3 },
  { name: "Cart", href: "/cart", icon: ShoppingBag, showBadge: true },
  { name: "Account", href: "/account/profile", icon: User },
];

export function MobileBottomBar() {
  const pathname = usePathname();
  const cartItemCount = useCartStore((s) => s.getItemCount());

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-light-gray lg:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 relative ${
                isActive ? "text-forest-green" : "text-medium-gray"
              }`}
            >
              <Icon size={20} />
              {tab.showBadge && cartItemCount > 0 && (
                <span className="absolute -top-0.5 right-0 bg-forest-green text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
