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

/**
 * Combined contact screen — Instagram handle + email on a single page.
 * Both fields are required to advance.
 */
export function Contact() {
  const instagram = useFlow((s) => s.data.instagram);
  const email = useFlow((s) => s.data.email);
  const setField = useFlow((s) => s.setField);

  const instagramOk = instagram.trim().length >= 2;
  const emailOk = EMAIL_RE.test(email.trim());
  const valid = instagramOk && emailOk;

  return (
    <ScreenShell
      topRight={<StepPill label="06 / 08" />}
      bottom={<BottomNav nextDisabled={!valid} />}
    >
      <motion.div className="flex flex-col gap-[18px] pt-8">
        <Eyebrow tone="clay">HOW WE REACH YOU</Eyebrow>
        <motion.h1
          variants={stageItem}
          className="font-display text-[32px] font-light leading-[1.1] tracking-[-0.033em] text-ink"
        >
          Where can we find you?
        </motion.h1>
        <motion.p
          variants={stageItem}
          className="font-sans text-[12px] font-medium leading-[1.5] text-clay"
        >
          Decision lands on your email. We check Instagram before adding — public accounts reply
          faster.
        </motion.p>

        <motion.div variants={stageItem} className="flex flex-col gap-5 pt-2">
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
          <UnderlineField
            label="EMAIL  ·  REQUIRED"
            tone="clay"
            value={email}
            onChange={(v) => setField('email', v.replace(/\s+/g, ''))}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </motion.div>
      </motion.div>
      <span />
    </ScreenShell>
  );
}
