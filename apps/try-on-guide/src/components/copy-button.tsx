'use client';

import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — silent fail; user can still select & copy */
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className="inline-flex items-center justify-center border border-[var(--color-border)] bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
    >
      {copied ? 'Copied' : 'Copy prompt'}
    </button>
  );
}
