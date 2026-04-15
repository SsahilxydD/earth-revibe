'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StepPill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { BottomNav } from '@/components/shell/BottomNav';
import { PillChoice } from '@/components/ui/ChoiceCard';
import type { YesMaybeNo } from '@/lib/types';

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
      topRight={<StepPill label="04 / 08" />}
      bottom={<BottomNav nextDisabled={!selected} />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-8">
        <Eyebrow>Q · 04</Eyebrow>
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
