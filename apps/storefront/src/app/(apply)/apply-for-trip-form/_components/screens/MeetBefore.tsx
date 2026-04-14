'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem } from '@/lib/apply/motion';
import { ScreenShell } from '@/app/(apply)/apply-for-trip-form/_components/shell/ScreenShell';
import { StepPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { Eyebrow } from '@/app/(apply)/apply-for-trip-form/_components/shell/Eyebrow';
import { BottomNav } from '@/app/(apply)/apply-for-trip-form/_components/shell/BottomNav';
import { PillChoice } from '@/app/(apply)/apply-for-trip-form/_components/ui/ChoiceCard';
import type { YesMaybeNo } from '@/lib/apply/types';

const OPTIONS: Array<{ id: YesMaybeNo; label: string }> = [
  { id: 'yes', label: 'Yes — bring on the meet' },
  { id: 'maybe', label: 'Maybe — depends on the vibe' },
  { id: 'no', label: 'No — straight to the trip' },
];

export function MeetBefore() {
  const selected = useFlow((s) => s.data.meetBefore);
  const setField = useFlow((s) => s.setField);

  return (
    <ScreenShell
      topRight={<StepPill label="09 / 10" />}
      bottom={<BottomNav nextDisabled={!selected} />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-8">
        <Eyebrow>Q · 09</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.031em] text-ink"
        >
          Comfortable meeting people before a trip?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-normal leading-[1.5] text-muted"
        >
          We host a small intro meet 1&ndash;2 weeks before each trip.
        </motion.p>
        <motion.div variants={stageItem} className="flex flex-col gap-[10px] pt-3">
          {OPTIONS.map((o) => (
            <PillChoice
              key={o.id}
              label={o.label}
              selected={selected === o.id}
              onSelect={() => setField('meetBefore', o.id)}
            />
          ))}
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
