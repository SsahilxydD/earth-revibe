'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface ShopAllLinkProps {
  href: string;
  label: string;
}

export function ShopAllLink({ href, label }: ShopAllLinkProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="text-center pt-12 px-6 lg:px-14"
      style={{ marginTop: 0, paddingTop: '48px' }}
    >
      <Link
        href={href}
        className="inline-block px-10 py-3 border border-black text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.1em] uppercase text-black hover:bg-black hover:text-white transition-colors"
      >
        {label}
      </Link>
    </motion.div>
  );
}
