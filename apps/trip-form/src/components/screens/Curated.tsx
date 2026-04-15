'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StepPill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { BottomNav } from '@/components/shell/BottomNav';
import { SplitCard } from '@/components/ui/ChoiceCard';

export function Curated() {
  const selected = useFlow((s) => s.data.curated);
  const setField = useFlow((s) => s.setField);

  return (
    <ScreenShell
      topRight={<StepPill label="08 / 08" />}
      bottom={<BottomNav nextDisabled={!selected} tone="clay" />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-7">
        <Eyebrow tone="clay">LAST QUESTION</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.031em] text-ink"
        >
          Are you okay with a curated selection?
        </motion.h1>
        <motion.div
          variants={stageItem}
          className="flex flex-col gap-2 rounded-[18px] border border-hairline bg-surface p-[18px]"
        >
          <span className="font-sans text-[9px] font-bold tracking-[0.18em] text-dim">
            WHY WE ASK
          </span>
          <span className="font-display text-[16px] font-light leading-[1.55] -tracking-[0.013em] text-ink">
            We accept ~30% of applicants per trip to keep the energy right. If you say yes,
            we&rsquo;ll reach out within 48 hours either way.
          </span>
        </motion.div>
        <motion.div variants={stageItem} className="flex gap-[10px] pt-1">
          <SplitCard
            title="Yes, I'm in"
            subtitle="I trust the process."
            selected={selected === 'yes'}
            onSelect={() => setField('curated', 'yes')}
          />
          <SplitCard
            title="Not really"
            subtitle="Open trips, please."
            selected={selected === 'no'}
            onSelect={() => setField('curated', 'no')}
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
