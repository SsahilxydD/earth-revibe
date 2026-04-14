'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem } from '@/lib/apply/motion';
import { ScreenShell } from '@/app/(apply)/apply-for-trip-form/_components/shell/ScreenShell';
import { StepPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { Eyebrow } from '@/app/(apply)/apply-for-trip-form/_components/shell/Eyebrow';
import { BottomNav } from '@/app/(apply)/apply-for-trip-form/_components/shell/BottomNav';
import { YesNoCard } from '@/app/(apply)/apply-for-trip-form/_components/ui/ChoiceCard';

export function PastTravel() {
  const selected = useFlow((s) => s.data.pastTravel);
  const setField = useFlow((s) => s.setField);

  return (
    <ScreenShell
      topRight={<StepPill label="07 / 10" />}
      bottom={<BottomNav nextDisabled={!selected} />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-10">
        <Eyebrow>Q · 07</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.031em] text-ink"
        >
          Have you traveled with new people before?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-normal leading-[1.5] text-muted"
        >
          Either way is okay &mdash; we host first-timers all the time.
        </motion.p>
        <motion.div variants={stageItem} className="flex flex-col gap-3 pt-4">
          <YesNoCard
            title="Yes — a few times."
            subtitle="Comfortable in mixed groups."
            selected={selected === 'yes'}
            onSelect={() => setField('pastTravel', 'yes')}
          />
          <YesNoCard
            title="No — first time."
            subtitle="Welcome — we've got you."
            selected={selected === 'no'}
            onSelect={() => setField('pastTravel', 'no')}
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
