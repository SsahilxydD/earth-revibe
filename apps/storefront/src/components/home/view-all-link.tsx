'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface ViewAllLinkProps {
  href: string;
}

export function ViewAllLink({ href }: ViewAllLinkProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="text-center mt-10 lg:hidden px-6"
    >
      <Link
        href={href}
        className="text-[11px] font-[var(--font-cinzel)] font-medium tracking-[0.08em] uppercase text-black hover:text-slate-500 transition-colors"
      >
        View All →
      </Link>
    </motion.div>
  );
}
