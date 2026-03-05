"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, ChevronRight, User, Package, Heart, Star, Gift, LogOut, HelpCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const shopLinks = [
  { name: "All Products", href: "/products" },
  { name: "Tops & Basics", href: "/categories/tops-basics" },
  { name: "Bottoms & Pants", href: "/categories/bottoms-pants" },
  { name: "Outerwear & Jackets", href: "/categories/outerwear-jackets" },
  { name: "New Arrivals", href: "/collections/new-arrivals" },
  { name: "Bestsellers", href: "/collections/bestsellers" },
];

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-gray">
          <span className="font-heading text-lg font-bold text-deep-earth">Earth Revibe</span>
          <button onClick={onClose} className="p-1 text-charcoal"><X size={24} /></button>
        </div>

        {/* User greeting */}
        {isAuthenticated && user && (
          <div className="p-4 bg-cream">
            <p className="text-sm font-medium text-deep-earth">Hello, {user.firstName}!</p>
            <p className="text-xs text-medium-gray">{user.email}</p>
          </div>
        )}

        {/* Shop links */}
        <div className="p-4">
          <p className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-3">Shop</p>
          {shopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex items-center justify-between py-3 text-sm text-charcoal border-b border-light-gray/50"
            >
              {link.name} <ChevronRight size={16} className="text-medium-gray" />
            </Link>
          ))}
        </div>

        {/* Pages */}
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-3">Explore</p>
          <Link href="/about" onClick={onClose} className="block py-3 text-sm text-charcoal border-b border-light-gray/50">Our Story</Link>
          <Link href="/blog" onClick={onClose} className="block py-3 text-sm text-charcoal border-b border-light-gray/50">Blog</Link>
          <Link href="/contact" onClick={onClose} className="block py-3 text-sm text-charcoal border-b border-light-gray/50">Contact</Link>
        </div>

        {/* Account */}
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-3">Account</p>
          {isAuthenticated ? (
            <>
              <Link href="/account/profile" onClick={onClose} className="flex items-center gap-3 py-3 text-sm text-charcoal border-b border-light-gray/50"><User size={18} /> My Profile</Link>
              <Link href="/account/orders" onClick={onClose} className="flex items-center gap-3 py-3 text-sm text-charcoal border-b border-light-gray/50"><Package size={18} /> My Orders</Link>
              <Link href="/account/wishlist" onClick={onClose} className="flex items-center gap-3 py-3 text-sm text-charcoal border-b border-light-gray/50"><Heart size={18} /> Wishlist</Link>
              <Link href="/account/loyalty" onClick={onClose} className="flex items-center gap-3 py-3 text-sm text-charcoal border-b border-light-gray/50"><Star size={18} /> Loyalty Points</Link>
              <Link href="/account/referrals" onClick={onClose} className="flex items-center gap-3 py-3 text-sm text-charcoal border-b border-light-gray/50"><Gift size={18} /> Referrals</Link>
              <Link href="/account/support" onClick={onClose} className="flex items-center gap-3 py-3 text-sm text-charcoal border-b border-light-gray/50"><HelpCircle size={18} /> Support</Link>
              <button onClick={() => { logout(); onClose(); }} className="flex items-center gap-3 py-3 text-sm text-error w-full"><LogOut size={18} /> Logout</button>
            </>
          ) : (
            <>
              <Link href="/auth/login" onClick={onClose} className="block py-3 text-sm font-medium text-forest-green">Login</Link>
              <Link href="/auth/register" onClick={onClose} className="block py-3 text-sm text-charcoal">Create Account</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
