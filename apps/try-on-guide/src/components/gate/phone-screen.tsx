'use client';

import { useState } from 'react';
import { useGate } from '@/lib/gate-store';
import { sendWhatsAppCode } from '@/lib/auth';

export function PhoneScreen() {
  const phone = useGate((s) => s.phone);
  const setPhone = useGate((s) => s.setPhone);
  const goToOtp = useGate((s) => s.goToOtp);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[0-9]{10}$/.test(phone);

  const handleSend = async () => {
    if (!valid || pending) return;
    setError(null);
    setPending(true);
    try {
      await sendWhatsAppCode(phone);
      goToOtp();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-dvh w-full max-w-full flex-col bg-white">
      {/* Top wordmark */}
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            Earth Revibe
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--color-muted)]">
            AI Try-On Guide
          </span>
        </div>
      </header>

      {/* Centered content */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Before we begin
          </p>
          <h1 className="mt-5 text-3xl font-bold uppercase leading-[1.1] tracking-[0.05em] text-[var(--color-primary)] md:text-4xl">
            Drop your
            <br />
            number.
          </h1>
          <p className="mt-5 text-sm leading-[1.8] text-[var(--color-muted)]">
            We&rsquo;ll send a one-time code on WhatsApp to unlock the guide. No spam, no
            promotional blasts &mdash; just the prompt and the next shirt drop.
          </p>

          {/* Phone input */}
          <label className="mt-8 block">
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--color-muted)]">
              Mobile number
            </span>
            <span className="mt-2 flex items-center gap-3 border-b-2 border-[var(--color-primary)] pb-2">
              <span aria-hidden className="text-base font-medium text-[var(--color-primary)]">
                +91
              </span>
              <span aria-hidden className="block h-5 w-px bg-[var(--color-border)]" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                aria-label="Mobile number"
                className="min-w-0 flex-1 bg-transparent text-base tracking-wide text-[var(--color-primary)] placeholder:text-[var(--color-muted)]/60 focus:outline-none"
              />
            </span>
          </label>

          {error ? <p className="mt-4 text-xs text-[var(--color-warn)]">{error}</p> : null}

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!valid || pending}
            className="mt-8 w-full bg-[var(--color-primary)] py-4 text-xs font-bold uppercase tracking-[0.25em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {pending ? 'Sending…' : 'Send WhatsApp code'}
          </button>

          <p className="mt-4 text-[10px] leading-relaxed text-[var(--color-muted)]">
            By continuing you agree to receive a one-time WhatsApp message from Earth Revibe via
            Meta. Standard WhatsApp privacy applies.
          </p>
        </div>
      </div>
    </main>
  );
}
