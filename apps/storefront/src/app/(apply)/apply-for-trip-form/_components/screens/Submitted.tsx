'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem, stageContainer, tapFeedback } from '@/lib/apply/motion';
import { TopBar, SubmittedPill } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { ArrowRight } from '@/app/(apply)/apply-for-trip-form/_components/shell/StepArrow';

export function Submitted() {
  const number = useFlow((s) => s.data.applicationNumber);
  const applicationId = number ?? 'ER-2026-1842';

  return (
    <div className="flex h-full flex-col bg-ink">
      <TopBar tone="paper" right={<SubmittedPill />} />
      <motion.section
        variants={stageContainer}
        initial="enter"
        animate="center"
        className="flex flex-1 flex-col justify-between overflow-y-auto px-6 screen-scroll"
      >
        <div className="flex flex-col gap-6 pt-14">
          <motion.div variants={stageItem}>
            <Stamp />
          </motion.div>
          <motion.span
            variants={stageItem}
            className="font-sans text-[10px] font-bold tracking-[0.18em] text-dim"
          >
            APPLICATION&nbsp;&nbsp;·&nbsp;&nbsp;#{applicationId}
          </motion.span>
          <motion.h1
            variants={stageItem}
            className="font-display text-[42px] font-light leading-[1.05] tracking-[-0.036em] text-paper"
          >
            We&rsquo;ve got you.
            <br />
            Reply within 48h.
          </motion.h1>
          <motion.p
            variants={stageItem}
            className="font-sans text-[14px] font-normal leading-[1.55] text-dim"
          >
            If selected, you&rsquo;ll be added to our private WhatsApp travel circle. Either way,
            we&rsquo;ll write back personally &mdash; no bots, no waiting lists.
          </motion.p>
        </div>

        <motion.div variants={stageItem} className="flex flex-col gap-[14px] pb-8 pt-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#3C342B] p-[18px]">
            <NextStep num="01" label="We read every word." tone="paper" />
            <NextStep num="02" label="Reply on Instagram DM." tone="paper" />
            <NextStep num="03" label="If yes — welcome to the circle." tone="clay" />
          </div>
          <motion.a
            {...tapFeedback}
            href="https://earthrevibe.com"
            className="flex h-14 w-full items-center justify-between gap-[10px] rounded-full bg-paper pl-6 pr-[6px] text-ink"
          >
            <span className="font-sans text-[13px] font-semibold -tracking-[0.005em]">
              While you wait — see the SS&rsquo;26 drop
            </span>
            <span className="grid size-[42px] place-items-center rounded-full bg-ink">
              <ArrowRight className="h-[10px] w-3" stroke="#f2ede3" />
            </span>
          </motion.a>
        </motion.div>
      </motion.section>
    </div>
  );
}

function Stamp() {
  return (
    <div className="relative size-[92px]">
      <div className="absolute inset-0 rounded-full border border-[#3C342B]" />
      <div className="absolute inset-2 rounded-full border border-[#5C4F44]" />
      <div className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay" />
      <span className="absolute left-[30px] top-[18px] font-display text-[11px] tracking-[0.18em] text-dim">
        ·&nbsp;N&nbsp;·
      </span>
      <span className="absolute left-[32px] top-[64px] font-display text-[11px] tracking-[0.18em] text-dim">
        ·&nbsp;S&nbsp;·
      </span>
    </div>
  );
}

function NextStep({ num, label, tone }: { num: string; label: string; tone: 'paper' | 'clay' }) {
  const color = tone === 'clay' ? 'text-clay' : 'text-paper';
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-[12px] font-normal tracking-[0.03em] text-dim">{num}</span>
      <span className={`font-sans text-[12px] font-medium ${color}`}>{label}</span>
    </div>
  );
}
