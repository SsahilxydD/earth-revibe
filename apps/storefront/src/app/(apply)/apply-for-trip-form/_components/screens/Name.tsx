'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem } from '@/lib/apply/motion';
import { ScreenShell } from '@/app/(apply)/apply-for-trip-form/_components/shell/ScreenShell';
import { StepPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { Eyebrow } from '@/app/(apply)/apply-for-trip-form/_components/shell/Eyebrow';
import { BottomNav } from '@/app/(apply)/apply-for-trip-form/_components/shell/BottomNav';
import { UnderlineField } from '@/app/(apply)/apply-for-trip-form/_components/ui/UnderlineField';

export function NameScreen() {
  const name = useFlow((s) => s.data.name);
  const setField = useFlow((s) => s.setField);
  const valid = name.trim().length >= 2;

  return (
    <ScreenShell
      topRight={<StepPill label="01 / 10" />}
      bottom={<BottomNav nextDisabled={!valid} hideBack />}
    >
      <motion.div className="flex flex-col gap-[22px] pt-10">
        <Eyebrow>Q · 01</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[38px] font-light leading-[1.1] tracking-[-0.036em] text-ink"
        >
          First, what should we call you?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-normal leading-[1.5] text-muted"
        >
          The name that goes on your boarding pass.
        </motion.p>
        <motion.div variants={stageItem} className="pt-2">
          <UnderlineField
            label="FULL NAME"
            value={name}
            onChange={(v) => setField('name', v)}
            placeholder="Aarav Mehra"
            autoComplete="name"
            autoFocus
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
