'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StepPill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { BottomNav } from '@/components/shell/BottomNav';
import { UnderlineField } from '@/components/ui/UnderlineField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailScreen() {
  const email = useFlow((s) => s.data.email);
  const setField = useFlow((s) => s.setField);
  const valid = EMAIL_RE.test(email.trim());

  return (
    <ScreenShell
      topRight={<StepPill label="05 / 11" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-[22px] pt-10">
        <Eyebrow>Q · 05</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[38px] font-light leading-[1.1] tracking-[-0.036em] text-ink"
        >
          Where should we write back?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[13px] font-medium leading-[1.5] text-clay"
        >
          Decision emails land here &mdash; approval, waitlist, or a kind no.
        </motion.p>
        <motion.div variants={stageItem} className="pt-2">
          <UnderlineField
            label="EMAIL  ·  REQUIRED"
            tone="clay"
            value={email}
            onChange={(v) => setField('email', v.replace(/\s+/g, ''))}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
