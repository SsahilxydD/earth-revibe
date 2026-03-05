"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Heart, ShoppingBag, User, Menu, ChevronDown, LogOut, Package, Gift, Star } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";

const navCategories = [
  { name: "All Products", href: "/products" },
  { name: "Tops & Basics", href: "/categories/tops-basics" },
  { name: "Bottoms & Pants", href: "/categories/bottoms-pants" },
  { name: "Outerwear & Jackets", href: "/categories/outerwear-jackets" },
  { name: "New Arrivals", href: "/collections/new-arrivals" },
  { name: "Bestsellers", href: "/collections/bestsellers" },
];

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItemCount = useCartStore((s) => s.getItemCount());
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 -ml-2 text-charcoal"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <Link href="/" className="font-heading text-xl lg:text-2xl font-bold text-deep-earth">
              Earth Revibe
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              <div
                className="relative"
                onMouseEnter={() => setIsShopOpen(true)}
                onMouseLeave={() => setIsShopOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm font-medium text-charcoal hover:text-forest-green transition-colors">
                  Shop <ChevronDown size={16} />
                </button>
                {isShopOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-light-gray py-2">
                    {navCategories.map((cat) => (
                      <Link
                        key={cat.href}
                        href={cat.href}
                        className="block px-4 py-2.5 text-sm text-charcoal hover:bg-cream hover:text-forest-green transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/about" className="text-sm font-medium text-charcoal hover:text-forest-green transition-colors">
                Our Story
              </Link>
              <Link href="/blog" className="text-sm font-medium text-charcoal hover:text-forest-green transition-colors">
                Blog
              </Link>
              <Link href="/contact" className="text-sm font-medium text-charcoal hover:text-forest-green transition-colors">
                Contact
              </Link>
            </nav>

            {/* Right icons */}
            <div className="flex items-center gap-2 lg:gap-4">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-charcoal hover:text-forest-green transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              <Link href="/account/wishlist" className="hidden sm:block p-2 text-charcoal hover:text-forest-green transition-colors">
                <Heart size={20} />
              </Link>

              <button
                onClick={() => useCartStore.getState().toggleCart()}
                className="relative p-2 text-charcoal hover:text-forest-green transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag size={20} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-forest-green text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemCount > 9 ? "9+" : cartItemCount}
                  </span>
                )}
              </button>

              {/* User dropdown */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setIsUserOpen(!isUserOpen)}
                  className="p-2 text-charcoal hover:text-forest-green transition-colors"
                  aria-label="Account"
                >
                  <User size={20} />
                </button>
                {isUserOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-light-gray py-2"
                    onMouseLeave={() => setIsUserOpen(false)}
                  >
                    {isAuthenticated ? (
                      <>
                        <div className="px-4 py-2 border-b border-light-gray">
                          <p className="text-sm font-medium text-deep-earth">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-medium-gray">{user?.email}</p>
                        </div>
                        <Link href="/account/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream"><User size={16} /> My Profile</Link>
                        <Link href="/account/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream"><Package size={16} /> My Orders</Link>
                        <Link href="/account/wishlist" className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream"><Heart size={16} /> Wishlist</Link>
                        <Link href="/account/loyalty" className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream"><Star size={16} /> Loyalty Points</Link>
                        <Link href="/account/referrals" className="flex items-center gap-2 px-4 py-2.5 text-sm text-charcoal hover:bg-cream"><Gift size={16} /> Referrals</Link>
                        <button onClick={logout} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-error hover:bg-cream"><LogOut size={16} /> Logout</button>
                      </>
                    ) : (
                      <>
                        <Link href="/auth/login" className="block px-4 py-2.5 text-sm text-charcoal hover:bg-cream font-medium">Login</Link>
                        <Link href="/auth/register" className="block px-4 py-2.5 text-sm text-charcoal hover:bg-cream">Create Account</Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search bar (slides down when open) */}
        {isSearchOpen && <SearchBar onClose={() => setIsSearchOpen(false)} />}
      </header>

      {/* Mobile nav drawer */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
