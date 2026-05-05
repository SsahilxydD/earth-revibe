'use client';

import { useEffect, useRef, useState } from 'react';
import { useGate } from '@/lib/gate-store';
import { sendWhatsAppCode, verifyWhatsAppCode } from '@/lib/auth';

const DIGITS = 6;
const RESEND_SECONDS = 24;

export function OtpScreen() {
  const phone = useGate((s) => s.phone);
  const otp = useGate((s) => s.otp);
  const setOtp = useGate((s) => s.setOtp);
  const goBackToPhone = useGate((s) => s.goBackToPhone);
  const markVerified = useGate((s) => s.markVerified);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [focus, setFocus] = useState(0);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const code = otp.padEnd(DIGITS, ' ');
  const complete = otp.length === DIGITS;
  const formattedPhone = phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : '';

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    refs.current[Math.min(otp.length, DIGITS - 1)]?.focus();
  }, []);

  const writeDigit = (i: number, char: string) => {
    const c = char.replace(/\D/g, '').slice(0, 1);
    if (!c) return;
    const arr = otp.padEnd(DIGITS, ' ').split('');
    arr[i] = c;
    const next = arr.join('').replace(/\s/g, '').slice(0, DIGITS);
    setOtp(next);
    setError(null);
    if (i < DIGITS - 1) {
      refs.current[i + 1]?.focus();
      setFocus(i + 1);
    }
  };

  const backspace = (i: number) => {
    const arr = otp.split('');
    if (arr[i]) {
      arr[i] = '';
      setOtp(arr.join(''));
      return;
    }
    if (i > 0) {
      refs.current[i - 1]?.focus();
      setFocus(i - 1);
      arr[i - 1] = '';
      setOtp(arr.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    setOtp(pasted);
    const nextFocus = Math.min(pasted.length, DIGITS - 1);
    refs.current[nextFocus]?.focus();
    setFocus(nextFocus);
  };

  const handleVerify = async () => {
    if (!complete || pending) return;
    setPending(true);
    setError(null);
    try {
      const ok = await verifyWhatsAppCode(phone, otp);
      if (!ok) {
        setError("That code didn't match. Try again or resend.");
        setOtp('');
        refs.current[0]?.focus();
        setFocus(0);
        return;
      }
      markVerified();
    } finally {
      setPending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || pending) return;
    try {
      await sendWhatsAppCode(phone);
      setCountdown(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend.');
    }
  };

  return (
    <main className="flex min-h-dvh w-full max-w-full flex-col bg-white">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            Earth Revibe
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Verify
          </span>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            WhatsApp &mdash; Verify
          </p>
          <h1 className="mt-5 text-3xl font-bold uppercase leading-[1.1] tracking-[0.05em] text-[var(--color-primary)] md:text-4xl">
            Check your
            <br />
            WhatsApp.
          </h1>
          <p className="mt-5 flex flex-wrap items-baseline gap-x-2 text-sm leading-[1.8] text-[var(--color-muted)]">
            <span>Code sent to</span>
            <span className="font-medium tracking-wide text-[var(--color-primary)]">
              {formattedPhone}
            </span>
            <button
              type="button"
              onClick={goBackToPhone}
              className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] underline underline-offset-4"
            >
              Edit
            </button>
          </p>

          {/* OTP boxes */}
          <div className="mt-8 grid grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: DIGITS }).map((_, i) => {
              const char = code[i].trim();
              const isFocus = focus === i && !char;
              const borderCls = char
                ? 'border-[var(--color-primary)]'
                : isFocus
                  ? 'border-[var(--color-primary)]'
                  : 'border-[var(--color-border)]';
              return (
                <div
                  key={i}
                  className={`relative aspect-[3/4] min-w-0 border-2 ${borderCls} bg-white transition-colors`}
                  onClick={() => {
                    refs.current[i]?.focus();
                    setFocus(i);
                  }}
                >
                  <input
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={char}
                    onFocus={() => setFocus(i)}
                    onChange={(e) => writeDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        e.preventDefault();
                        backspace(i);
                      }
                    }}
                    onPaste={handlePaste}
                    className="absolute inset-0 w-full bg-transparent text-center text-2xl font-bold text-[var(--color-primary)] caret-[var(--color-primary)] focus:outline-none"
                    aria-label={`Digit ${i + 1}`}
                  />
                </div>
              );
            })}
          </div>

          {error ? <p className="mt-4 text-xs text-[var(--color-warn)]">{error}</p> : null}

          <div className="mt-6 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
            <span>Waiting for the ping…</span>
            {countdown > 0 ? (
              <span>Resend in 00:{countdown.toString().padStart(2, '0')}</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-[var(--color-primary)] underline underline-offset-4"
              >
                Resend
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={!complete || pending}
            className="mt-8 w-full bg-[var(--color-primary)] py-4 text-xs font-bold uppercase tracking-[0.25em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {pending ? 'Verifying…' : 'Verify & continue'}
          </button>

          <p className="mt-4 text-[10px] leading-relaxed text-[var(--color-muted)]">
            Powered by WhatsApp Business via Meta. Codes valid for 10 minutes.
          </p>
        </div>
      </div>
    </main>
  );
}
