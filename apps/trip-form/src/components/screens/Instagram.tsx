'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StepPill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { BottomNav } from '@/components/shell/BottomNav';
import { UnderlineField } from '@/components/ui/UnderlineField';

export function InstagramScreen() {
  const instagram = useFlow((s) => s.data.instagram);
  const setField = useFlow((s) => s.setField);
  const valid = instagram.trim().length >= 2;

  return (
    <ScreenShell
      topRight={<StepPill label="04 / 10" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-[22px] pt-10">
        <Eyebrow>Q · 04</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[38px] font-light leading-[1.1] tracking-[-0.036em] text-ink"
        >
          And your Instagram?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-medium leading-[1.5] text-clay"
        >
          We check profiles before adding &mdash; public accounts get a faster reply.
        </motion.p>
        <motion.div variants={stageItem} className="pt-2">
          <UnderlineField
            label="INSTAGRAM  ·  REQUIRED"
            tone="clay"
            value={instagram}
            onChange={(v) => setField('instagram', v.replace(/^@+/, '').replace(/\s+/g, ''))}
            placeholder="yourhandle"
            prefix="@"
            autoComplete="off"
            autoFocus
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
