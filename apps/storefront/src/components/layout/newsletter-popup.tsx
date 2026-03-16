"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "er-newsletter-dismissed";

export function NewsletterPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-xl">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-black/40 hover:text-black transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">
          Join the Culture
        </h3>
        <p className="mt-2 text-sm text-black/60">
          Get early access to drops, deals and exclusive content.
        </p>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            dismiss();
          }}
        >
          <input
            type="email"
            placeholder="Your email address"
            className="flex-1 rounded-[var(--button-radius)] border border-black/20 px-4 py-2.5 text-sm outline-none focus:border-black/50"
            required
          />
          <button
            type="submit"
            className="shrink-0 rounded-[var(--button-radius)] bg-black px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-black/90 transition-colors"
          >
            Subscribe
          </button>
        </form>
      </div>
    </div>
  );
}
