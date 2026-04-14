'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem } from '@/lib/apply/motion';
import { ScreenShell } from '@/app/(apply)/apply-for-trip-form/_components/shell/ScreenShell';
import { StepPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { Eyebrow } from '@/app/(apply)/apply-for-trip-form/_components/shell/Eyebrow';
import { BottomNav } from '@/app/(apply)/apply-for-trip-form/_components/shell/BottomNav';
import { SplitCard } from '@/app/(apply)/apply-for-trip-form/_components/ui/ChoiceCard';
import { submitApplication } from '@/lib/apply/submit';

export function Curated() {
  const selected = useFlow((s) => s.data.curated);
  const data = useFlow((s) => s.data);
  const setField = useFlow((s) => s.setField);
  const goNext = useFlow((s) => s.goNext);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    try {
      const { id, applicationNumber } = await submitApplication(data);
      setField('applicationId', id);
      setField('applicationNumber', applicationNumber);
      goNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <ScreenShell
      topRight={<StepPill label="10 / 10" />}
      bottom={
        <BottomNav
          nextLabel="Submit application"
          nextDisabled={!selected}
          onNext={onSubmit}
          pending={pending}
          tone="clay"
        />
      }
    >
      <motion.div className="flex flex-col gap-[18px] pt-7">
        <Eyebrow tone="clay">Q · 10 · LAST ONE</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.031em] text-ink"
        >
          Are you okay with a curated selection?
        </motion.h1>
        <motion.div
          variants={stageItem}
          className="flex flex-col gap-2 rounded-[18px] border border-hairline bg-apply-surface p-[18px]"
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
        {error ? (
          <motion.p variants={stageItem} className="font-sans text-[12px] text-clay">
            {error}
          </motion.p>
        ) : null}
      </motion.div>
      <span />
    </ScreenShell>
  );
}
