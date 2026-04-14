'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { sendWhatsAppCode } from '@/lib/auth';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { GatePill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { ArrowRight } from '@/components/shell/StepArrow';

export function PhoneGate() {
  const phone = useFlow((s) => s.data.phone);
  const setField = useFlow((s) => s.setField);
  const goNext = useFlow((s) => s.goNext);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[0-9]{10}$/.test(phone);

  const handleSend = async () => {
    if (!valid || pending) return;
    setError(null);
    setPending(true);
    try {
      await sendWhatsAppCode(phone);
      goNext(); // advance to OTP screen
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  };

  return (
    <ScreenShell topRight={<GatePill label="GATE  ·  STEP 00" />}>
      <motion.div className="flex flex-col gap-[22px] pt-10">
        <Eyebrow>BEFORE WE BEGIN</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[42px] font-light leading-[1.05] tracking-[-0.038em] text-ink"
        >
          What&rsquo;s your number?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-normal leading-[1.55] text-muted"
        >
          We send the trip drop, the meet-up location, and your selection update &mdash; nothing
          else. No promo spam, ever.
        </motion.p>
        <motion.label variants={stageItem} className="flex flex-col gap-2">
          <span className="font-sans text-[9px] font-bold tracking-[0.18em] text-dim">
            MOBILE NUMBER
          </span>
          <span className="flex h-16 items-end gap-3 border-b-[1.5px] border-ink pb-[14px]">
            <span className="flex items-center gap-[6px] pr-2 pt-1">
              <span className="text-[18px] leading-none" aria-hidden>
                🇮🇳
              </span>
              <span className="font-display text-[26px] font-light tracking-[-0.015em] text-ink">
                +91
              </span>
            </span>
            <span aria-hidden className="mb-[6px] block h-7 w-px bg-hairline" />
            <input
              value={phone}
              onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              className="min-w-0 flex-1 bg-transparent font-display text-[28px] font-light tracking-[0.012em] text-ink caret-clay placeholder:text-dim placeholder:font-light outline-none"
              aria-label="Mobile number"
            />
          </span>
        </motion.label>

        <motion.div
          variants={stageItem}
          className="flex items-center gap-3 rounded-[14px] border border-hairline bg-surface p-[14px]"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-wa text-paper">
            <svg viewBox="0 0 14 10" className="h-[10px] w-[14px]" fill="none" aria-hidden>
              <path
                d="M1 5 L5.2 8.8 L13 1.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block font-sans text-[12px] font-semibold text-ink">
              We&rsquo;ll send a code on WhatsApp.
            </span>
            <span className="mt-[2px] block font-sans text-[11px] font-normal text-muted">
              Open WhatsApp to grab it &mdash; one tap and you&rsquo;re in.
            </span>
          </span>
        </motion.div>

        {error ? (
          <motion.p variants={stageItem} className="font-sans text-[12px] text-clay">
            {error}
          </motion.p>
        ) : null}
      </motion.div>

      <motion.div variants={stageItem} className="flex flex-col gap-4 pb-8 pt-6">
        <div className="flex items-center justify-between gap-4 px-1">
          <TrustItem label="WhatsApp Business" />
          <TrustItem label="End-to-end" />
          <TrustItem label="OTP only" />
        </div>
        <motion.button
          whileTap={{ scale: 0.985 }}
          disabled={!valid || pending}
          onClick={handleSend}
          className={`flex h-16 w-full items-center justify-between gap-[10px] rounded-[18px] bg-ink pl-6 pr-[6px] text-paper transition-opacity ${
            valid && !pending ? 'opacity-100' : 'opacity-40'
          }`}
        >
          <span className="font-sans text-[15px] font-semibold -tracking-[0.005em]">
            {pending ? 'Sending…' : 'Send WhatsApp code'}
          </span>
          <span className="grid size-[52px] place-items-center rounded-full bg-clay">
            {pending ? (
              <span className="block size-[14px] animate-spin rounded-full border-[1.5px] border-paper border-t-transparent" />
            ) : (
              <ArrowRight className="h-[10px] w-3" stroke="#f2ede3" />
            )}
          </span>
        </motion.button>
        <p className="text-center font-sans text-[10px] font-normal leading-[1.55] text-dim">
          By continuing you agree to receive a one-time WhatsApp message from Earth Revibe via Meta.
          Standard WhatsApp privacy applies.
        </p>
      </motion.div>
    </ScreenShell>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-[6px]">
      <span aria-hidden className="block size-[5px] rounded-full bg-wa" />
      <span className="font-sans text-[10px] font-semibold tracking-[0.04em] text-muted">
        {label}
      </span>
    </span>
  );
}
