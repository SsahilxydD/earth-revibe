'use client';

import { useState } from 'react';

/**
 * Homepage "First access. Always." subscribe block. Posts to the same
 * endpoint as the newsletter popup (see newsletter-popup.tsx).
 */
export function NewsletterInline() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'done'>('idle');

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    fetch(`${window.location.origin}/api/v1/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    }).catch(() => {});
    setStatus('done');
  };

  return (
    <div className="border-t border-[#E2DBCD] px-6 pb-16 pt-12">
      <p className="text-[11px] font-medium tracking-[0.25em] text-[#8A8378]">STAY IN THE LOOP</p>
      <h3 className="mt-5 text-[26px] font-light leading-tight text-[#171310]">
        First access.
        <br />
        <span className="italic">Always.</span>
      </h3>
      <p className="mt-4 text-[13px] font-light leading-relaxed text-[#8A8378]">
        New drops, early access and buyback notes — delivered quietly.
      </p>

      {status === 'done' ? (
        <p className="mt-8 text-sm font-medium text-[#171310]">
          You&rsquo;re in. First access, always. ✦
        </p>
      ) : (
        <form onSubmit={subscribe} className="mt-8">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full border-b border-[#B7AE9E] bg-transparent pb-2.5 text-sm text-[#171310] placeholder:text-[#B7AE9E] focus:border-[#171310] focus:outline-none"
          />
          <button
            type="submit"
            className="mt-6 h-12 w-full bg-[#171310] text-[11px] font-medium uppercase tracking-[0.25em] text-[#FAF7F0] transition-opacity hover:opacity-90"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
