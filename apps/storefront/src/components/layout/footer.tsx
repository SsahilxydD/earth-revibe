'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Instagram, Facebook, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SECTIONS = [
  {
    title: 'SHOP',
    links: [
      { label: 'New Arrivals', href: '/categories/new-arrivals' },
      { label: 'Bestsellers', href: '/categories/bestsellers' },
      { label: 'All Products', href: '/products' },
      { label: 'T-Shirts', href: '/categories/t-shirts' },
      { label: 'Shirts', href: '/categories/shirts' },
      { label: 'Polos', href: '/categories/polos' },
      { label: 'Bottomwear', href: '/categories/bottomwear' },
    ],
  },
  {
    title: 'SUPPORT',
    links: [
      { label: 'Track Order', href: '/track-order' },
      { label: 'Returns & Exchanges', href: '/policies/returns' },
      { label: 'Shipping Policy', href: '/policies/shipping' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'ABOUT US',
    links: [{ label: 'Our Story', href: '/about' }],
  },
  {
    title: 'LEGAL',
    links: [
      { label: 'Privacy Policy', href: '/policies/privacy' },
      { label: 'Terms of Service', href: '/policies/terms' },
    ],
  },
] as const;

function PalmLeaves() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0.06,
      }}
    >
      {/* Top-left: frond growing in from left edge */}
      <svg
        viewBox="0 0 200 200"
        style={{
          position: 'absolute',
          left: -60,
          top: -30,
          width: 220,
          height: 220,
          transform: 'rotate(35deg)',
        }}
      >
        <g fill="#000">
          {/* Central stem */}
          <path
            d="M100 200 C98 160 95 120 90 80 C87 60 85 40 88 20"
            stroke="#000"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Left leaflets */}
          <path d="M90 80 C70 65 45 55 20 50 C45 60 65 70 85 78" />
          <path d="M92 100 C68 88 40 82 10 80 C40 88 65 95 88 98" />
          <path d="M94 120 C72 112 48 108 20 108 C48 114 70 118 90 118" />
          <path d="M95 140 C78 135 58 132 35 132 C58 137 76 140 92 139" />
          <path d="M96 155 C82 152 66 150 48 150 C66 154 80 156 93 154" />
          {/* Right leaflets */}
          <path d="M90 80 C108 62 130 50 160 45 C132 55 112 68 95 78" />
          <path d="M92 100 C112 85 138 76 170 72 C140 82 115 92 96 98" />
          <path d="M94 120 C112 110 135 104 162 102 C136 109 114 116 97 118" />
          <path d="M95 140 C110 134 128 130 150 128 C130 134 112 138 98 139" />
          <path d="M96 155 C108 150 122 148 140 147 C124 152 110 154 99 154" />
          {/* Tip leaflets */}
          <path d="M88 20 C78 10 65 2 48 0 C62 8 75 16 86 24" />
          <path d="M88 20 C95 8 108 0 125 0 C110 8 98 16 90 24" />
          <path d="M89 40 C75 30 58 24 38 22 C56 30 72 36 87 42" />
          <path d="M89 40 C102 28 120 22 142 20 C122 28 106 36 92 42" />
          <path d="M90 60 C76 50 58 44 38 42 C56 50 74 56 88 60" />
          <path d="M90 60 C104 48 124 42 148 40 C126 48 108 56 93 60" />
        </g>
      </svg>
      {/* Top-right: frond growing in from right edge */}
      <svg
        viewBox="0 0 200 200"
        style={{
          position: 'absolute',
          right: -60,
          top: -20,
          width: 200,
          height: 200,
          transform: 'rotate(-30deg) scaleX(-1)',
        }}
      >
        <g fill="#000">
          <path
            d="M100 200 C98 160 95 120 90 80 C87 60 85 40 88 20"
            stroke="#000"
            strokeWidth="1.5"
            fill="none"
          />
          <path d="M90 80 C70 65 45 55 20 50 C45 60 65 70 85 78" />
          <path d="M92 100 C68 88 40 82 10 80 C40 88 65 95 88 98" />
          <path d="M94 120 C72 112 48 108 20 108 C48 114 70 118 90 118" />
          <path d="M95 140 C78 135 58 132 35 132 C58 137 76 140 92 139" />
          <path d="M90 80 C108 62 130 50 160 45 C132 55 112 68 95 78" />
          <path d="M92 100 C112 85 138 76 170 72 C140 82 115 92 96 98" />
          <path d="M94 120 C112 110 135 104 162 102 C136 109 114 116 97 118" />
          <path d="M95 140 C110 134 128 130 150 128 C130 134 112 138 98 139" />
          <path d="M88 20 C78 10 65 2 48 0 C62 8 75 16 86 24" />
          <path d="M88 20 C95 8 108 0 125 0 C110 8 98 16 90 24" />
          <path d="M89 40 C75 30 58 24 38 22 C56 30 72 36 87 42" />
          <path d="M89 40 C102 28 120 22 142 20 C122 28 106 36 92 42" />
          <path d="M90 60 C76 50 58 44 38 42 C56 50 74 56 88 60" />
          <path d="M90 60 C104 48 124 42 148 40 C126 48 108 56 93 60" />
        </g>
      </svg>
      {/* Bottom-right: smaller frond from bottom-right corner */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: 'absolute',
          right: -15,
          bottom: -25,
          width: 120,
          height: 120,
          transform: 'rotate(-50deg) scaleX(-1)',
          opacity: 0.7,
        }}
      >
        <g fill="#000">
          <path
            d="M50 100 C49 80 48 60 46 40 C45 30 44 20 46 10"
            stroke="#000"
            strokeWidth="1"
            fill="none"
          />
          <path d="M46 40 C36 32 24 26 10 24 C24 30 34 36 44 40" />
          <path d="M46 40 C56 30 68 24 84 22 C70 30 58 36 48 40" />
          <path d="M47 55 C38 48 26 44 12 42 C26 48 36 52 45 54" />
          <path d="M47 55 C56 46 70 42 86 40 C72 46 58 52 49 54" />
          <path d="M46 10 C40 4 30 0 18 0 C28 6 38 10 45 14" />
          <path d="M46 10 C52 2 64 0 78 0 C66 6 56 10 48 14" />
          <path d="M47 25 C38 18 26 14 12 12 C26 18 36 22 45 26" />
          <path d="M47 25 C56 16 70 12 86 10 C72 16 58 22 49 26" />
        </g>
      </svg>
    </div>
  );
}

function AccordionSection({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 400, color: '#000', letterSpacing: 2 }}>
          {title}
        </span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} color="#CCC" />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', width: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                paddingBottom: 16,
              }}
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ fontSize: 12, fontWeight: 300, color: '#999', textDecoration: 'none' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ height: 1, backgroundColor: '#EEE', width: '100%' }} />
    </>
  );
}

export function Footer() {
  return (
    <footer
      className="font-[family-name:var(--font-inter)]"
      style={{
        backgroundColor: '#F5F5F5',
        paddingBottom: 'calc(0px + env(safe-area-inset-bottom, 0px))',
        position: 'relative',
      }}
    >
      {/* Palm leaves anchored to corners */}
      <PalmLeaves />

      {/* Logo + brand name — centered, 36px logo */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '40px 28px 20px 28px',
        }}
      >
        <Link href="/">
          <Image
            src="/Earth Revibe Logo Black.png"
            alt="Earth Revibe"
            width={36}
            height={36}
            className="h-9 w-auto"
          />
        </Link>
        <span style={{ fontSize: 11, fontWeight: 400, color: '#000', letterSpacing: 3 }}>
          EARTH REVIBE
        </span>
      </div>

      {/* Accordion sections — 46px each, centered */}
      <div style={{ padding: '0 28px' }}>
        {SECTIONS.map((section) => (
          <AccordionSection key={section.title} title={section.title} links={section.links} />
        ))}
      </div>

      {/* Social icons — centered, 20px gap */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '20px 0 0 0' }}>
        <motion.a
          href="https://www.instagram.com/earthrevibe.co/"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Instagram"
        >
          <Instagram size={18} color="#000" />
        </motion.a>
        <motion.a
          href="https://www.facebook.com/profile.php?id=61578133014979"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Facebook"
        >
          <Facebook size={18} color="#000" />
        </motion.a>
        <motion.a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          aria-label="YouTube"
        >
          <Youtube size={18} color="#000" />
        </motion.a>
      </div>

      {/* Copyright */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 28px 24px 28px' }}>
        <span style={{ fontSize: 9, fontWeight: 300, color: '#999' }}>
          &copy; {new Date().getFullYear()} Earth Revibe &middot; Made in India
        </span>
      </div>
    </footer>
  );
}
