'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem, tapFeedback } from '@/lib/motion';
import { verifyWhatsAppCode, sendWhatsAppCode } from '@/lib/auth';
import { submitApplication } from '@/lib/submit';
import {
  identifyUser,
  trackPhoneVerified,
  trackApplicationSubmitted,
  trackApplicationSubmitFailed,
} from '@/lib/analytics';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { GatePill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { ArrowRight, ArrowLeft } from '@/components/shell/StepArrow';

const DIGITS = 6;
const RESEND_SECONDS = 24;

export function OtpVerify() {
  const phone = useFlow((s) => s.data.phone);
  const otp = useFlow((s) => s.data.otp);
  const data = useFlow((s) => s.data);
  const setField = useFlow((s) => s.setField);
  const goNext = useFlow((s) => s.goNext);
  const goBack = useFlow((s) => s.goBack);

  const [focus, setFocus] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => otp.padEnd(DIGITS, ' '), [otp]);
  const complete = otp.length === DIGITS;

  // Resend timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  // Autofocus first empty digit on mount
  useEffect(() => {
    refs.current[Math.min(otp.length, DIGITS - 1)]?.focus();
  }, []);

  const formattedPhone = phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : '+91 98765 43210';

  const writeDigit = (i: number, char: string) => {
    const c = char.replace(/\D/g, '').slice(0, 1);
    if (!c) return;
    const arr = otp.split('');
    arr[i] = c;
    const next = arr.join('').slice(0, DIGITS);
    setField('otp', next);
    setError(null);
    if (i < DIGITS - 1) {
      refs.current[i + 1]?.focus();
      setFocus(i + 1);
    }
  };

  const backspace = (i: number) => {
    if (otp[i]) {
      const arr = otp.split('');
      arr[i] = '';
      setField('otp', arr.join(''));
      return;
    }
    if (i > 0) {
      refs.current[i - 1]?.focus();
      setFocus(i - 1);
      const arr = otp.split('');
      arr[i - 1] = '';
      setField('otp', arr.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (!pasted) return;
    setField('otp', pasted);
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
        setField('otp', '');
        refs.current[0]?.focus();
        setFocus(0);
        return;
      }
      setField('phoneVerified', true);

      const e164 = `+91${phone}`;
      identifyUser(e164, {
        phone: e164,
        name: data.name || undefined,
        email: data.email || undefined,
        city: data.city || undefined,
        instagram: data.instagram || undefined,
      });
      trackPhoneVerified({ phone: e164 });

      // Phone is verified → NOW submit the application. Same-origin cookies
      // set by verify-otp ride along. Only proceed to Submitted screen if
      // the API accepts the submission.
      try {
        const { id } = await submitApplication(data);
        setField('applicationId', id);
        trackApplicationSubmitted({
          applicationId: id,
          travelerType: data.travelerType,
          pastTravel: data.pastTravel,
          meetBefore: data.meetBefore,
          curated: data.curated,
          tripPrefsCount: data.tripPrefs.length,
        });
        goNext();
      } catch (e) {
        const reason = e instanceof Error ? e.message : 'Could not submit — please retry.';
        trackApplicationSubmitFailed({ reason });
        setError(reason);
      }
    } finally {
      setPending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await sendWhatsAppCode(phone);
    setCountdown(RESEND_SECONDS);
  };

  return (
    <ScreenShell topRight={<GatePill label="VERIFY  ·  STEP 00b" />}>
      <motion.div className="flex flex-col gap-[22px] pt-10">
        <Eyebrow tone="wa">WHATSAPP&nbsp;&nbsp;·&nbsp;&nbsp;VERIFY</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[38px] font-light leading-[1.05] tracking-[-0.034em] text-ink"
        >
          Check your WhatsApp.
        </motion.h1>

        <motion.div
          variants={stageItem}
          className="flex flex-wrap items-baseline gap-[6px] font-sans text-[13px] text-muted"
        >
          <span>Code sent on WhatsApp to</span>
          <span className="font-display text-[14px] font-normal tracking-[0.005em] text-ink">
            {formattedPhone}
          </span>
          <span className="text-dim">·</span>
          <button
            onClick={goBack}
            className="font-sans text-[12px] font-medium text-clay underline underline-offset-2"
          >
            Edit
          </button>
        </motion.div>

        <motion.div variants={stageItem} className="flex justify-between gap-2 pt-2">
          {Array.from({ length: DIGITS }).map((_, i) => {
            const char = code[i].trim();
            const isFocus = focus === i && !char;
            const borderCls = char
              ? 'border-ink'
              : isFocus
                ? 'border-[2px] border-wa'
                : 'border-hairline';
            return (
              <div
                key={i}
                className={`relative grid h-[66px] w-[50px] place-items-center rounded-2xl border bg-surface transition-colors ${borderCls}`}
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
                  className="absolute inset-0 bg-transparent text-center font-display text-[28px] font-light -tracking-[0.02em] text-ink caret-wa outline-none"
                  aria-label={`Digit ${i + 1}`}
                />
              </div>
            );
          })}
        </motion.div>

        <motion.div
          variants={stageItem}
          className="flex items-center justify-between gap-4 pt-[10px] pr-1 pl-1"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden className="block size-[6px] rounded-full bg-wa" />
            <span className="font-sans text-[11px] font-medium text-muted">
              Waiting for the WhatsApp ping…
            </span>
          </span>
          <span className="flex items-center gap-[6px]">
            <span className="font-sans text-[11px] font-medium text-dim">
              {countdown > 0 ? 'Resend in' : ''}
            </span>
            {countdown > 0 ? (
              <span className="font-display text-[12px] text-ink">
                00:{countdown.toString().padStart(2, '0')}
              </span>
            ) : (
              <button
                onClick={handleResend}
                className="font-sans text-[11px] font-semibold text-clay underline underline-offset-2"
              >
                Resend
              </button>
            )}
          </span>
        </motion.div>

        <motion.div variants={stageItem} className="pt-3">
          <motion.a
            {...tapFeedback}
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-wa bg-wa px-[14px] py-[10px] font-sans text-[11px] font-semibold text-paper"
          >
            <span aria-hidden className="block size-2 rounded-full bg-paper" />
            Open WhatsApp
          </motion.a>
        </motion.div>

        {error ? (
          <motion.p variants={stageItem} className="font-sans text-[12px] text-clay">
            {error}
          </motion.p>
        ) : null}
      </motion.div>

      <motion.div variants={stageItem} className="flex flex-col gap-[14px] pb-8 pt-4">
        <div className="flex items-center justify-between gap-3">
          <motion.button
            {...tapFeedback}
            onClick={goBack}
            aria-label="Go back"
            className="grid size-14 shrink-0 place-items-center rounded-full border border-ink text-ink"
          >
            <ArrowLeft className="h-[10px] w-3" />
          </motion.button>
          <motion.button
            {...tapFeedback}
            onClick={handleVerify}
            disabled={!complete || pending}
            className={`flex h-16 flex-1 items-center justify-between gap-[10px] rounded-[18px] bg-ink pl-6 pr-[6px] text-paper transition-opacity ${
              complete && !pending ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <span className="flex items-center gap-[10px] font-sans text-[15px] font-semibold -tracking-[0.005em]">
              {pending ? (
                <span className="block size-[14px] animate-spin rounded-full border-[1.5px] border-wa border-t-transparent" />
              ) : (
                <span className="block size-[14px] rounded-full border-[1.5px] border-wa border-t-transparent" />
              )}
              {pending ? 'Verifying…' : 'Verify & continue'}
            </span>
            <span className="grid size-[52px] place-items-center rounded-full bg-clay">
              <ArrowRight className="h-[10px] w-3" stroke="#f2ede3" />
            </span>
          </motion.button>
        </div>
        <p className="text-center font-sans text-[10px] text-dim">
          Powered by WhatsApp Business via Meta &nbsp;·&nbsp; Codes valid for 10 minutes.
        </p>
      </motion.div>
    </ScreenShell>
  );
}
