'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { stageItem } from '@/lib/motion';
import { ScreenShell } from '@/components/shell/ScreenShell';
import { StepPill } from '@/components/shell/TopBar';
import { Eyebrow } from '@/components/shell/Eyebrow';
import { BottomNav } from '@/components/shell/BottomNav';
import { UnderlineField } from '@/components/ui/UnderlineField';

/**
 * Combined profile screen — name + age + city on a single page.
 * All three fields are required to advance.
 */
export function BasicProfile() {
  const name = useFlow((s) => s.data.name);
  const age = useFlow((s) => s.data.age);
  const city = useFlow((s) => s.data.city);
  const setField = useFlow((s) => s.setField);

  const nameOk = name.trim().length >= 2;
  const ageNum = Number(age);
  const ageOk = /^\d{1,2}$/.test(age) && ageNum >= 16 && ageNum <= 99;
  const cityOk = city.trim().length >= 2;
  const valid = nameOk && ageOk && cityOk;

  return (
    <ScreenShell
      topRight={<StepPill label="05 / 08" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-8">
        <Eyebrow>ABOUT YOU</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.033em] text-ink"
        >
          Tell us a bit about you.
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[12px] font-normal leading-[1.5] text-muted"
        >
          Goes on your boarding pass — all three required.
        </motion.p>

        <motion.div variants={stageItem} className="flex flex-col gap-5 pt-2">
          <UnderlineField
            label="FULL NAME"
            value={name}
            onChange={(v) => setField('name', v)}
            placeholder="Aarav Mehra"
            autoComplete="name"
            autoFocus
          />
          <UnderlineField
            label="AGE"
            value={age}
            onChange={(v) => setField('age', v.replace(/\D/g, '').slice(0, 2))}
            placeholder="24"
            inputMode="numeric"
            maxLength={2}
            autoComplete="off"
          />
          <UnderlineField
            label="CITY"
            value={city}
            onChange={(v) => setField('city', v)}
            placeholder="Mumbai"
            autoComplete="address-level2"
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
