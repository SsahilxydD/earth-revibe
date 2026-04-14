'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem } from '@/lib/apply/motion';
import { ScreenShell } from '@/app/(apply)/apply-for-trip-form/_components/shell/ScreenShell';
import { StepPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { Eyebrow } from '@/app/(apply)/apply-for-trip-form/_components/shell/Eyebrow';
import { BottomNav } from '@/app/(apply)/apply-for-trip-form/_components/shell/BottomNav';
import { CheckboxCard } from '@/app/(apply)/apply-for-trip-form/_components/ui/CheckboxCard';
import type { TripPrefId } from '@/lib/apply/types';

const OPTIONS: Array<{
  id: TripPrefId;
  title: string;
  sub: string;
}> = [
  {
    id: 'mountains',
    title: 'Mountains',
    sub: 'Above the Clouds  ·  Manali · Kasol · Spiti',
  },
  {
    id: 'beaches',
    title: 'Beaches',
    sub: 'Salt on Skin  ·  Goa · Gokarna · Andamans',
  },
  {
    id: 'weekend',
    title: 'Short weekend trips',
    sub: 'Fri evening — Sun night, max 3 days.',
  },
  {
    id: 'luxury',
    title: 'Luxury chill trips',
    sub: 'Pools, villas, slow days, good food.',
  },
];

export function TripPrefs() {
  const prefs = useFlow((s) => s.data.tripPrefs);
  const setField = useFlow((s) => s.setField);
  const valid = prefs.length >= 1;

  const toggle = (id: TripPrefId) => {
    setField('tripPrefs', prefs.includes(id) ? prefs.filter((p) => p !== id) : [...prefs, id]);
  };

  return (
    <ScreenShell
      topRight={<StepPill label="08 / 10" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-4 pt-8">
        <Eyebrow>Q · 08</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.031em] text-ink"
        >
          Which trips excite you most?
        </motion.h1>
        <motion.p variants={stageItem} className="font-sans text-[13px] font-normal text-muted">
          Pick all that apply.
        </motion.p>
        <motion.div variants={stageItem} className="flex flex-col gap-2 pt-[10px]">
          {OPTIONS.map((o) => (
            <CheckboxCard
              key={o.id}
              title={o.title}
              subtitle={o.sub}
              checked={prefs.includes(o.id)}
              onToggle={() => toggle(o.id)}
            />
          ))}
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
