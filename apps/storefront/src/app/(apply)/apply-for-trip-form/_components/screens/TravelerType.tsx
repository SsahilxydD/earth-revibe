'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem } from '@/lib/apply/motion';
import { ScreenShell } from '@/app/(apply)/apply-for-trip-form/_components/shell/ScreenShell';
import { StepPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { Eyebrow } from '@/app/(apply)/apply-for-trip-form/_components/shell/Eyebrow';
import { BottomNav } from '@/app/(apply)/apply-for-trip-form/_components/shell/BottomNav';
import { ChoiceCard } from '@/app/(apply)/apply-for-trip-form/_components/ui/ChoiceCard';
import type { TravelerTypeId } from '@/lib/apply/types';

const OPTIONS: Array<{
  id: TravelerTypeId;
  letter: string;
  title: string;
  sub: string;
}> = [
  {
    id: 'chill',
    letter: 'A',
    title: 'Chill & aesthetic',
    sub: 'Cafés, golden hour, slow mornings.',
  },
  {
    id: 'party',
    letter: 'B',
    title: 'Party & social',
    sub: 'Late nights, new people, loud music.',
  },
  {
    id: 'explorer',
    letter: 'C',
    title: 'Explorer / adventure',
    sub: 'Treks, off-grid roads, hidden trails.',
  },
  { id: 'mix', letter: 'D', title: 'Mix of everything', sub: 'A bit of chill, a bit of chaos.' },
];

export function TravelerType() {
  const selected = useFlow((s) => s.data.travelerType);
  const setField = useFlow((s) => s.setField);

  return (
    <ScreenShell
      topRight={<StepPill label="05 / 10" />}
      bottom={<BottomNav nextDisabled={!selected} />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-8">
        <Eyebrow>Q · 05</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.031em] text-ink"
        >
          What kind of traveler are you?
        </motion.h1>
        <motion.div variants={stageItem} className="flex flex-col gap-[10px] pt-3">
          {OPTIONS.map((o) => (
            <ChoiceCard
              key={o.id}
              letter={o.letter}
              title={o.title}
              subtitle={o.sub}
              selected={selected === o.id}
              onSelect={() => setField('travelerType', o.id)}
            />
          ))}
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
