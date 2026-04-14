'use client';

import { motion } from 'framer-motion';
import { useFlow } from '@/lib/apply/store';
import { stageItem, tapFeedback } from '@/lib/apply/motion';
import { TopBar } from '@/app/(apply)/apply-for-trip-form/_components/shell/TopBar';
import { ArrowRight } from '@/app/(apply)/apply-for-trip-form/_components/shell/StepArrow';

export function Welcome() {
  const goNext = useFlow((s) => s.goNext);

  return (
    <div className="flex h-full flex-col bg-paper">
      <TopBar
        right={
          <span className="font-sans text-[11px] font-semibold tracking-[0.1em] text-dim">EN</span>
        }
      />
      <motion.section
        initial="enter"
        animate="center"
        variants={{ enter: {}, center: { transition: { staggerChildren: 0.07 } } }}
        className="flex flex-1 flex-col justify-between overflow-y-auto px-6 screen-scroll"
      >
        <div className="flex flex-col gap-6 pt-14">
          <motion.div
            variants={stageItem}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-ink/10 px-[10px] py-[6px]"
          >
            <span aria-hidden className="block size-[6px] rounded-full bg-clay" />
            <span className="font-sans text-[10px] font-bold tracking-[0.14em] text-ink">
              TRAVEL&nbsp;&nbsp;CIRCLE&nbsp;&nbsp;·&nbsp;&nbsp;SS&rsquo;26
            </span>
          </motion.div>
          <motion.h1
            variants={stageItem}
            className="font-display text-[56px] font-light leading-[1.02] tracking-[-0.036em] text-ink"
          >
            Six places.
            <br />
            Six moods.
            <br />
            One circle.
          </motion.h1>
          <motion.p
            variants={stageItem}
            className="font-sans text-[14px] font-normal leading-[1.55] text-ink-soft"
          >
            A small, hand-picked group of travelers chasing mountains, beaches and quiet luxury
            &mdash; together. Apply in 2 minutes.
          </motion.p>

          <motion.div variants={stageItem} className="flex items-center gap-[14px] pt-3">
            <div className="flex flex-col gap-1">
              <span className="font-display text-[26px] font-normal -tracking-[0.02em] text-ink">
                10
              </span>
              <span className="font-sans text-[9px] font-bold tracking-[0.18em] text-dim">
                QUESTIONS
              </span>
            </div>
            <span className="h-9 w-px bg-hairline" />
            <div className="flex flex-col gap-1">
              <span className="font-display text-[26px] font-normal -tracking-[0.02em] text-ink">
                ~2 MIN
              </span>
              <span className="font-sans text-[9px] font-bold tracking-[0.18em] text-dim">
                TO&nbsp;&nbsp;COMPLETE
              </span>
            </div>
          </motion.div>

          <motion.div variants={stageItem} className="mt-2">
            <TopoArt />
          </motion.div>
        </div>

        <motion.div variants={stageItem} className="flex flex-col gap-4 pb-8 pt-6">
          <motion.button
            {...tapFeedback}
            onClick={goNext}
            className="flex h-16 w-full items-center justify-between gap-[10px] rounded-[18px] bg-ink pl-6 pr-[6px] text-paper"
          >
            <span className="font-sans text-[15px] font-semibold -tracking-[0.005em]">
              Begin application
            </span>
            <span className="grid size-[52px] place-items-center rounded-full bg-clay">
              <ArrowRight className="h-[10px] w-3" stroke="#f2ede3" />
            </span>
          </motion.button>
          <p className="text-center font-sans text-[10px] font-medium tracking-[0.08em] text-dim">
            Reviewed by humans&nbsp;&nbsp;·&nbsp;&nbsp;Reply within 48h
          </p>
        </motion.div>
      </motion.section>
    </div>
  );
}

/** Topographic hero illustration — 3 concentric partial rings + clay pin + coordinates */
function TopoArt() {
  return (
    <div className="relative h-[200px] w-full overflow-hidden rounded-3xl bg-[#1A1714]">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(200deg, #2C2620 0%, #1A1714 60%, #0D0B09 100%)',
        }}
      />
      {/* Concentric rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute size-[480px] rounded-full border border-[#3C342B]"
        style={{ left: -110, top: 40 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute size-[360px] rounded-full border border-[#5C4F44]"
        style={{ left: -50, top: 80 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute size-[240px] rounded-full border border-[#8C7A66]"
        style={{ left: 10, top: 120 }}
      />
      {/* Pin */}
      <div
        aria-hidden
        className="pointer-events-none absolute size-3 rounded-full bg-clay"
        style={{ left: 130, top: 100 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute size-7 rounded-full border border-clay/70"
        style={{ left: 122, top: 92 }}
      />
      {/* Coordinates */}
      <div className="absolute left-[18px] top-4 flex flex-col gap-1">
        <span className="font-display text-[11px] font-normal tracking-[0.04em] text-dim">
          N&nbsp;32°14&prime;&nbsp;&nbsp;·&nbsp;&nbsp;E&nbsp;77°10&prime;
        </span>
        <span className="font-display text-[22px] font-light -tracking-[0.03em] text-paper">
          Where it begins.
        </span>
      </div>
      {/* Bottom-right meta */}
      <span className="absolute bottom-3 right-4 font-sans text-[9px] font-bold tracking-[0.16em] text-dim">
        47 PIECES&nbsp;&nbsp;·&nbsp;&nbsp;6 VIBES
      </span>
    </div>
  );
}
