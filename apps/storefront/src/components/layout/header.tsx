'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { SearchBar } from './search-bar';

const menuCategories = [
  { name: 'All Products', slug: 'all-products', href: '/products' },
  { name: 'T-Shirts', slug: 't-shirts', href: '/categories/t-shirts' },
  { name: 'Shirts', slug: 'shirts', href: '/categories/shirts' },
  { name: 'Polos', slug: 'polos', href: '/categories/polos' },
  { name: 'Cargo Pants', slug: 'cargo-pants', href: '/categories/cargo-pants' },
  { name: 'Trousers', slug: 'trousers', href: '/categories/trousers' },
  { name: 'Outerwear', slug: 'outerwear', href: '/categories/outerwear' },
];

export function Header() {
  const { isHeaderTransparent } = useUIStore();
  const totalItems = useCartStore((s) => s.getItemCount());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) setIsSearchOpen(false);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isMobileMenuOpen]);

  const scrolledState = !isHeaderTransparent || isScrolled;
  const logoSrc = (scrolledState || isMobileMenuOpen)
    ? '/Earth Revibe Logo Black.png'
    : '/Earth Revibe Logo White.png';

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-500 ${
          isMobileMenuOpen
            ? 'bg-white'
            : scrolledState
              ? 'bg-white'
              : 'bg-transparent'
        }`}
      >
        <nav className="w-full px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-3 items-center h-16 lg:h-20 w-full">
            {/* Left - Menu Button */}
            <div className="flex justify-start">
              <motion.button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                type="button"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                className={`flex items-center gap-3 py-2 transition-colors duration-300 ${
                  scrolledState || isMobileMenuOpen ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-[18px] h-[10px] flex flex-col justify-between">
                  <motion.span
                    className="block h-[2px] w-full bg-current origin-center"
                    animate={isMobileMenuOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  <motion.span
                    className="block h-[2px] w-full bg-current origin-center"
                    animate={isMobileMenuOpen ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-sm font-medium tracking-wide hidden sm:block">Shop</span>
              </motion.button>
            </div>

            {/* Center - Logo */}
            <div className="flex justify-center">
              <Link href="/" className={isMobileMenuOpen ? 'hidden sm:block' : 'block'}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative h-7 sm:h-[34px] w-[100px] sm:w-[119px]"
                >
                  <Image
                    key={logoSrc}
                    src={logoSrc}
                    alt="Earth Revibe"
                    fill
                    sizes="(max-width: 640px) 100px, 119px"
                    className="object-contain"
                    loading="eager"
                    priority
                  />
                </motion.div>
              </Link>
            </div>

            {/* Right - Icons */}
            <div className="flex justify-end items-center gap-3 sm:gap-2 lg:gap-4">
              {/* Search */}
              <motion.button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`relative p-2 transition-colors duration-300 ${
                  scrolledState || isMobileMenuOpen ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'
                }`}
                whileTap={{ scale: 0.95 }}
                aria-label={isSearchOpen ? 'Close search' : 'Open search'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </motion.button>

              {/* Wishlist */}
              <Link
                href="/account/wishlist"
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block relative p-2 transition-colors duration-300 ${
                  scrolledState || isMobileMenuOpen ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'
                }`}
                aria-label="Wishlist"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </Link>

              {/* Account */}
              <Link
                href="/account/profile"
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:block relative p-2 transition-colors duration-300 ${
                  scrolledState || isMobileMenuOpen ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'
                }`}
                aria-label="Account"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </Link>

              {/* Cart */}
              <motion.button
                onClick={() => useCartStore.getState().toggleCart()}
                className={`relative p-2 transition-colors duration-300 ${
                  scrolledState || isMobileMenuOpen ? 'text-black hover:text-black/70' : 'text-white hover:text-white/70'
                }`}
                whileTap={{ scale: 0.95 }}
                aria-label="Cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <AnimatePresence>
                  {isMounted && totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-0 right-0 bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Search Bar Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-16 lg:top-20 left-0 right-0 z-40"
            >
              <SearchBar onClose={() => setIsSearchOpen(false)} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-30"
              onClick={() => setIsSearchOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Full Screen Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white z-40 pt-16 lg:pt-20"
          >
            <motion.div
              className="h-full flex flex-col justify-start pt-8 px-10 sm:px-14 pb-20 lg:pb-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <nav className="border-t border-transparent">
                {menuCategories.map((category, index) => (
                  <motion.div
                    key={category.slug}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.05 + index * 0.04,
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                    className="border-b border-transparent"
                  >
                    <Link
                      href={category.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between py-4 group text-slate-500 hover:text-black transition-colors duration-300"
                    >
                      <span className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase group-hover:text-black transition-colors duration-300">
                        {category.name}
                      </span>
                      <span className="text-[11px] text-slate-400 group-hover:text-black transition-colors duration-300">
                        →
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
