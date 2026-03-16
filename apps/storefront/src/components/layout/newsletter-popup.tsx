"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
      <div className="relative w-full max-w-sm rounded-xl bg-white px-10 pb-12 pt-14 text-center shadow-2xl">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-black/30 hover:text-black transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex justify-center">
          <Image
            src="/Earth Revibe Logo Black.png"
            alt="Earth Revibe"
            width={80}
            height={20}
            className="h-auto w-10"
          />
        </div>

        <h3 className="mt-8 text-lg font-bold uppercase tracking-[0.15em]">
          Join the Culture
        </h3>

        <p className="mx-auto mt-4 max-w-[240px] text-sm leading-relaxed text-black/50">
          Get early access to drops, deals and exclusive content.
        </p>

        <form
          className="mt-10 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            dismiss();
          }}
        >
          <input
            type="email"
            placeholder="Your email address"
            className="w-full rounded-[var(--button-radius)] border border-black/15 px-4 py-3.5 text-center text-sm outline-none focus:border-black/40"
            required
          />
          <button
            type="submit"
            className="w-full rounded-[var(--button-radius)] bg-black py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-black/90 transition-colors"
          >
            Subscribe
          </button>
        </form>
      </div>
    </div>
  );
}
