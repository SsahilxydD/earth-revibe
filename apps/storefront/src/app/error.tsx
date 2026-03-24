"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-sale)]/10">
        <svg
          className="h-8 w-8 text-[var(--color-sale)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      <h1 className="mt-6 text-2xl font-bold uppercase tracking-wider">
        Something Went Wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-[var(--color-muted)]">
        An unexpected error occurred. Please try again or contact support if
        the problem persists.
      </p>

      {/* Show error details in production too — helps debugging */}
      <div className="mt-4 max-w-lg rounded-[var(--button-radius)] bg-[var(--color-surface)] p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Error Details
        </p>
        <p className="mt-1 break-all text-xs text-[var(--color-sale)]">
          {error.message}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Digest: {error.digest}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="mt-8 inline-flex items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-primary)] px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#2a2a2a]"
      >
        Try Again
      </button>
    </div>
  );
}
