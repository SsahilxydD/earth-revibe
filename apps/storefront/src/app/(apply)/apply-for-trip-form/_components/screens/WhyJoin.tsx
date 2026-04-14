'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem } from '@/lib/apply/motion';
import { ScreenShell } from '@/app/(apply)/apply-for-trip-form/_components/shell/ScreenShell';
import { StepPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { Eyebrow } from '@/app/(apply)/apply-for-trip-form/_components/shell/Eyebrow';
import { BottomNav } from '@/app/(apply)/apply-for-trip-form/_components/shell/BottomNav';

const MAX = 600;
const MIN = 40;

export function WhyJoin() {
  const value = useFlow((s) => s.data.whyJoin);
  const setField = useFlow((s) => s.setField);
  const valid = value.trim().length >= MIN;

  return (
    <ScreenShell
      topRight={<StepPill label="06 / 10" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-8">
        <Eyebrow>Q · 06</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.031em] text-ink"
        >
          Why do you want to join this circle?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-normal leading-[1.55] text-apply-muted"
        >
          This is the part we read closest. A few honest lines work better than a polished pitch.
        </motion.p>
        <motion.div
          variants={stageItem}
          className="flex flex-col gap-3 rounded-[18px] border border-hairline bg-apply-surface p-[18px]"
        >
          <textarea
            value={value}
            onChange={(e) => setField('whyJoin', e.target.value.slice(0, MAX))}
            placeholder="Honestly — I've been wanting to travel more, but most of my friends are stuck at work."
            rows={6}
            className="min-h-[160px] resize-none bg-transparent font-display text-[17px] font-light leading-[1.55] -tracking-[0.013em] text-ink placeholder:text-ink/40 placeholder:font-light outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-medium tracking-[0.04em] text-dim">
              Your words, not AI.
            </span>
            <span
              className={`font-sans text-[10px] font-semibold ${
                value.length > MAX - 40 ? 'text-clay' : 'text-ink'
              }`}
            >
              {value.length} / {MAX}
            </span>
          </div>
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
