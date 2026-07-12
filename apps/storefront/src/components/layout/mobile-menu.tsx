'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ChevronDown, ChevronRight, ArrowRight, Instagram, Twitter, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore, lockBodyScroll, unlockBodyScroll } from '@/stores/ui-store';

// Shop accordion: the four categories live under one "ALL PIECES" parent so
// the drawer stays short; OFFERS keeps its own top-level row.
const ALL_PIECES_CHILDREN = [
  { label: 'VIEW ALL PIECES', href: '/products' },
  { label: 'SHIRTS', href: '/products?category=shirts' },
  { label: 'POLOS', href: '/products?category=polos' },
  { label: 'T-SHIRTS', href: '/products?category=t-shirts' },
  { label: 'BOTTOMWEAR', href: '/products?category=bottomwear' },
];

// Mirrors the vibe row on /products (labels + imagery stay in sync).
const VIBES = [
  { label: 'Beach Vibe', href: '/products?vibe=salt-on-skin', img: '/vibes/beach.webp' },
  {
    label: 'Mountain Vibe',
    href: '/products?vibe=above-the-clouds',
    img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=80&fm=jpg',
  },
  {
    label: 'City Vibe',
    href: '/products?vibe=neon-nomads',
    img: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=200&q=80&fm=jpg',
  },
];

const UTILITIES = [
  { label: 'TRACK ORDER', href: '/track-order' },
  { label: 'WISHLIST', href: '/account/wishlist' },
  { label: 'WE PAY YOU BACK', href: '/account/loyalty' },
  { label: 'SIZE GUIDE', href: '/faq' },
  { label: 'CONTACT US', href: '/contact' },
];

export function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUiStore();
  const [shopExpanded, setShopExpanded] = useState(true);

  useEffect(() => {
    if (isMobileMenuOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isMobileMenuOpen]);

  const handleLinkClick = () => closeMobileMenu();

  if (!isMobileMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={closeMobileMenu} />

      {/* Panel */}
      <div className="absolute left-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-[#FAF7F0] shadow-2xl animate-slide-in-left">
        {/* Header — logo mark, not the wordmark */}
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" onClick={handleLinkClick}>
            <Image
              src="/Earth Revibe Logo Black.png"
              alt="Earth Revibe"
              width={120}
              height={30}
              className="h-auto w-9"
            />
          </Link>
          <button
            onClick={closeMobileMenu}
            className="flex h-9 w-9 items-center justify-center"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>

        {/* Sign-in card */}
        <Link
          href="/auth/login"
          onClick={handleLinkClick}
          className="mx-5 mt-1 flex items-center gap-4 rounded-xl bg-[#F0EAE0] px-4 py-4"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#171310]">
            <User className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-[#171310]">Sign in</span>
            <span className="mt-0.5 block text-[11px] font-light leading-snug text-[#6B6459]">
              Rewards, order tracking &amp; faster checkout
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#171310]" strokeWidth={1.5} />
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-6 pt-7">
          <p className="text-[10px] font-medium tracking-[0.25em] text-[#8A8378]">SHOP</p>

          {/* ALL PIECES accordion */}
          <button
            onClick={() => setShopExpanded((v) => !v)}
            className="flex w-full items-center justify-between border-b border-[#E2DBCD] py-4 text-[13px] font-medium tracking-[0.18em] text-[#171310]"
            aria-expanded={shopExpanded}
          >
            ALL PIECES
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                shopExpanded && 'rotate-180'
              )}
              strokeWidth={1.5}
            />
          </button>
          {shopExpanded && (
            <ul className="animate-slide-down border-b border-[#E2DBCD] py-1">
              {ALL_PIECES_CHILDREN.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    onClick={handleLinkClick}
                    className="flex items-center justify-between py-2.5 pl-4 text-[11.5px] font-normal tracking-[0.16em] text-[#6B6459]"
                  >
                    {c.label}
                    <ChevronRight className="h-3.5 w-3.5 text-[#B7AE9E]" strokeWidth={1.5} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/offers"
            onClick={handleLinkClick}
            className="flex items-center justify-between border-b border-[#E2DBCD] py-4 text-[13px] font-medium tracking-[0.18em] text-[#A9663B]"
          >
            OFFERS
            <ChevronRight className="h-4 w-4 text-[#B7AE9E]" strokeWidth={1.5} />
          </Link>

          {/* By vibe */}
          <p className="pt-7 text-[10px] font-medium tracking-[0.25em] text-[#8A8378]">BY VIBE</p>
          <ul className="pt-2">
            {VIBES.map((v) => (
              <li key={v.href}>
                <Link
                  href={v.href}
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span className="relative h-[26px] w-[26px] shrink-0 overflow-hidden rounded-full">
                    <Image src={v.img} alt="" fill sizes="26px" className="object-cover" />
                  </span>
                  <span className="flex-1 text-[13px] text-[#171310]">{v.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#B7AE9E]" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>

          {/* Utilities */}
          <div className="mt-5 border-t border-[#E2DBCD] pt-5">
            {UTILITIES.map((u) => (
              <Link
                key={u.href}
                href={u.href}
                onClick={handleLinkClick}
                className="block py-2.5 text-[11px] font-medium tracking-[0.18em] text-[#6B6459]"
              >
                {u.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer — socials */}
        <div className="flex items-center justify-between border-t border-[#E2DBCD] px-5 py-4">
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/earthrevibe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0EAE0] transition-colors hover:bg-[#171310] hover:text-white"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.6} />
            </a>
            <a
              href="https://twitter.com/earthrevibe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0EAE0] transition-colors hover:bg-[#171310] hover:text-white"
              aria-label="Twitter"
            >
              <Twitter className="h-4 w-4" strokeWidth={1.6} />
            </a>
            <span className="text-[11px] text-[#6B6459]">@earthrevibe</span>
          </div>
          <span className="text-[9px] font-medium tracking-[0.2em] text-[#8A8378]">
            MADE IN INDIA
          </span>
        </div>
      </div>
    </div>
  );
}
