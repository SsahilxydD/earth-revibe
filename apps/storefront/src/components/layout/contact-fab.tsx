'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Instagram, LifeBuoy, MessageCircle, Ticket, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeOverlayActive } from '@/stores/ui-store';

const PHONE_DIGITS = '919328706759';
const INSTAGRAM_URL = 'https://www.instagram.com/earthrevibe.co/';
const WHATSAPP_URL = `https://wa.me/${PHONE_DIGITS}`;
const SUPPORT_URL = '/account/support';

export function ContactFab() {
  const [open, setOpen] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);

  // Collapse + hide while any overlay (cart drawer, search, mobile menu,
  // modals…) is mounted on top — they all ref-count the body-scroll lock,
  // so this single subscription covers every case.
  useEffect(
    () =>
      subscribeOverlayActive((active) => {
        setOverlayActive(active);
        if (active) setOpen(false);
      }),
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      className={cn(
        'fixed right-4 bottom-20 z-50 transition-all duration-200 md:right-6 md:bottom-6',
        overlayActive
          ? 'pointer-events-none translate-y-2 opacity-0'
          : 'pointer-events-auto translate-y-0 opacity-100'
      )}
      aria-hidden={overlayActive}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="absolute bottom-16 right-0 w-64 origin-bottom-right overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xl"
            role="dialog"
            aria-label="Contact options"
          >
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Contact us
              </p>
              <p className="mt-0.5 text-sm font-medium">Pick a channel</p>
            </div>
            <ul className="flex flex-col py-1">
              <ContactRow
                href={SUPPORT_URL}
                icon={Ticket}
                label="Ticket system"
                hint="Track & raise issues"
                onClick={() => setOpen(false)}
              />
              <ContactRow
                href={INSTAGRAM_URL}
                external
                icon={Instagram}
                label="Instagram"
                hint="@earthrevibe.co"
                onClick={() => setOpen(false)}
              />
              <ContactRow
                href={WHATSAPP_URL}
                external
                icon={MessageCircle}
                label="WhatsApp"
                hint="+91 93287 06759"
                onClick={() => setOpen(false)}
              />
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close contact menu' : 'Contact us'}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform',
          'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black/40 focus:ring-offset-2'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

function ContactRow({
  href,
  icon: Icon,
  label,
  hint,
  external,
  onClick,
}: {
  href: string;
  icon: typeof Ticket;
  label: string;
  hint: string;
  external?: boolean;
  onClick: () => void;
}) {
  const className =
    'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-bg-subtle,#f5f5f5)]';
  const inner = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-black">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-[11px] text-[var(--color-muted)]">{hint}</span>
      </span>
    </>
  );

  return (
    <li>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={onClick}
        >
          {inner}
        </a>
      ) : (
        <Link href={href} className={className} onClick={onClick}>
          {inner}
        </Link>
      )}
    </li>
  );
}
