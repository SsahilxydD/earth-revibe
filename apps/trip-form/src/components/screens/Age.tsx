'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StepPill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { BottomNav } from '@/components/shell/BottomNav';
import { UnderlineField } from '@/components/ui/UnderlineField';

export function AgeScreen() {
  const age = useFlow((s) => s.data.age);
  const setField = useFlow((s) => s.setField);
  const n = parseInt(age, 10);
  const valid = !Number.isNaN(n) && n >= 16 && n <= 99;

  return (
    <ScreenShell
      topRight={<StepPill label="02 / 10" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-[22px] pt-10">
        <Eyebrow>Q · 02</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[38px] font-light leading-[1.1] tracking-[-0.036em] text-ink"
        >
          How old are you?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-normal leading-[1.5] text-muted"
        >
          We mostly host travelers between 20&ndash;30.
        </motion.p>
        <motion.div variants={stageItem} className="pt-2">
          <UnderlineField
            label="AGE"
            value={age}
            onChange={(v) => setField('age', v.replace(/\D/g, '').slice(0, 2))}
            placeholder="24"
            inputMode="numeric"
            autoFocus
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
