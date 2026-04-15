'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StepPill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { BottomNav } from '@/components/shell/BottomNav';
import { UnderlineField } from '@/components/ui/UnderlineField';

export function CityScreen() {
  const city = useFlow((s) => s.data.city);
  const setField = useFlow((s) => s.setField);
  const valid = city.trim().length >= 2;

  return (
    <ScreenShell
      topRight={<StepPill label="03 / 11" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-[22px] pt-10">
        <Eyebrow>Q · 03</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[38px] font-light leading-[1.1] tracking-[-0.036em] text-ink"
        >
          Where are you based?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-normal leading-[1.5] text-muted"
        >
          Helps us match you with nearby travelers.
        </motion.p>
        <motion.div variants={stageItem} className="pt-2">
          <UnderlineField
            label="CITY"
            value={city}
            onChange={(v) => setField('city', v)}
            placeholder="Bangalore"
            autoComplete="address-level2"
            autoFocus
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
