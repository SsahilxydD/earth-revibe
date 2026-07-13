'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';

const STORAGE_KEY = 'er-newsletter-dismissed';
const EMAIL_KEY = 'er-guest-email';

/**
 * Syncs guest email + cart items to the server for abandoned cart recovery.
 * Called when the newsletter popup captures an email, and on beforeunload
 * if the guest has items in cart.
 */
function syncGuestCart(email: string) {
  const items = useCartStore.getState().items;
  if (!items || items.length === 0) return;

  const payload = {
    email,
    items: items.map((i) => ({
      variantId: i.id,
      productName: i.name,
      slug: i.slug,
      price: i.price,
      quantity: i.quantity,
    })),
  };

  // Use sendBeacon for reliability (works even on page unload)
  const apiBase =
    typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}/api/v1`
      : '';

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${apiBase}/cart/guest-snapshot`,
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );
  } else {
    fetch(`${apiBase}/cart/guest-snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}

export function NewsletterPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const emailRef = useRef<string | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  // Sync cart on page unload if guest email is captured
  useEffect(() => {
    // Check if we already have a guest email from a previous session
    const savedEmail = localStorage.getItem(EMAIL_KEY);
    if (savedEmail) emailRef.current = savedEmail;

    const handleUnload = () => {
      const guestEmail = emailRef.current;
      if (guestEmail) {
        syncGuestCart(guestEmail);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const trimmedEmail = email.trim();

    // Save email for abandoned cart tracking
    localStorage.setItem(EMAIL_KEY, trimmedEmail);
    emailRef.current = trimmedEmail;

    // Sync current cart to server
    syncGuestCart(trimmedEmail);

    // Send discount code email instantly (fire-and-forget)
    fetch(`${window.location.origin}/api/v1/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail }),
    }).catch(() => {});

    dismiss();
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-md rounded-xl bg-[#FAF7F0] px-8 py-14 text-center shadow-2xl sm:px-12">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-black/30 hover:text-black transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/Earth Revibe Logo Black.png"
            alt="Earth Revibe"
            width={80}
            height={20}
            className="h-auto w-10"
          />
        </div>

        {/* Heading */}
        <h3 className="mt-6 text-base font-bold uppercase tracking-[0.2em]">Join the Culture</h3>

        {/* Description — single line */}
        <p className="mt-3 text-sm text-black/50">
          Get early access to drops, deals and exclusive content.
        </p>

        {/* Form */}
        <form className="mt-8 flex flex-col gap-3" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="w-full rounded-[var(--button-radius)] border border-black/15 px-4 py-3.5 text-center text-sm outline-none focus:border-black/40"
            required
          />
          <button
            type="submit"
            className="w-full rounded-[var(--button-radius)] bg-black py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-black/90 transition-colors"
          >
            Join the List
          </button>
        </form>
      </div>
    </div>
  );
}
