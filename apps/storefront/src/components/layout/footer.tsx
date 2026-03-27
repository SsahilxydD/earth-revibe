'use client';

import Link from 'next/link';
import Image from 'next/image';

const SHOP_LINKS = [
  { label: 'New Arrivals', href: '/categories/new-arrivals' },
  { label: 'Shirts', href: '/categories/shirts' },
  { label: 'T-Shirts', href: '/categories/t-shirts' },
  { label: 'Outerwear', href: '/categories/outerwear' },
  { label: 'Bestsellers', href: '/categories/bestsellers' },
];

const CUSTOMER_LINKS = [
  { label: 'Track Order', href: '/track-order' },
  { label: 'Returns & Exchanges', href: '/policies/returns' },
  { label: 'Shipping Policy', href: '/policies/shipping' },
  { label: 'FAQs', href: '/faq' },
  { label: 'Contact Us', href: '/contact' },
];

const ABOUT_LINKS = [
  { label: 'Our Story', href: '/about' },
  { label: 'Privacy Policy', href: '/policies/privacy' },
  { label: 'Terms of Service', href: '/policies/terms' },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-black">{title}</h3>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-black/60 transition-colors hover:text-black"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-white pb-[calc(9rem+env(safe-area-inset-bottom,0px))] text-black lg:pb-0">
      {/* Logo */}
      <div className="flex justify-center px-4 pt-8 pb-4">
        <Link href="/">
          <Image
            src="/Earth Revibe Logo Black.png"
            alt="Earth Revibe"
            width={80}
            height={20}
            className="h-auto w-14"
          />
        </Link>
      </div>

      {/* Columns */}
      <div className="px-4 py-6 md:px-8 lg:px-12 xl:px-20">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Customer Service" links={CUSTOMER_LINKS} />
          <FooterColumn title="About Us" links={ABOUT_LINKS} />
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-black">
              Connect
            </h3>
            <div className="flex gap-3">
              <a
                href="https://instagram.com/earthrevibe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/20 text-black/60 transition-colors hover:border-black hover:text-black"
                aria-label="Instagram"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://twitter.com/earthrevibe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/20 text-black/60 transition-colors hover:border-black hover:text-black"
                aria-label="Twitter"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://youtube.com/@earthrevibe"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/20 text-black/60 transition-colors hover:border-black hover:text-black"
                aria-label="YouTube"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <p className="px-4 pb-6 text-xs text-black/30 md:px-8 lg:px-12 xl:px-20">
        &copy; {new Date().getFullYear()} Earth Revibe. All rights reserved.
      </p>
    </footer>
  );
}
