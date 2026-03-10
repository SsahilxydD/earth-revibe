'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Shop error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white">
      <div className="h-16 lg:h-20" aria-hidden="true" />
      <div className="flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-8 border border-slate-200 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>

          <h1 className="text-[20px] font-[var(--font-cinzel)] font-medium tracking-[0.04em] text-black mb-3">
            Something Went Wrong
          </h1>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-8">
            We ran into an issue loading this page. Please try again, or head
            back to our homepage.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reset}
              className="h-11 px-8 bg-black text-white text-[11px] font-medium tracking-[0.1em] uppercase rounded-full hover:bg-black/85 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="h-11 px-8 flex items-center border border-slate-300 text-black text-[11px] font-medium tracking-[0.1em] uppercase rounded-full hover:border-black transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
