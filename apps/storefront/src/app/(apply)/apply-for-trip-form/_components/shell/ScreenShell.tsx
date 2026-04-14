import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { TopBar, StepPill } from './TopBar';
import { stageContainer } from '@/lib/apply/motion';

type ScreenShellProps = {
  /** Right-hand side of the TopBar. Most question screens use <StepPill /> — passed in so callers can swap. */
  topRight?: ReactNode;
  /** Whether the TopBar logo + right pill should render in paper tone (used on the dark Submitted screen). */
  tone?: 'ink' | 'paper';
  /** Main content between TopBar + BottomBar. */
  children: ReactNode;
  /** Persistent bottom bar (BottomNav for question screens, custom CTA otherwise). */
  bottom?: ReactNode;
  /** Override the stage padding (defaults to px-6). */
  stageClassName?: string;
  /** Custom background — defaults to paper. Used by the final screen to flip dark. */
  background?: 'paper' | 'ink';
};

export function ScreenShell({
  topRight,
  tone = 'ink',
  children,
  bottom,
  stageClassName = '',
  background = 'paper',
}: ScreenShellProps) {
  const bg = background === 'ink' ? 'bg-ink' : 'bg-paper';
  return (
    <div className={`flex h-full flex-col ${bg}`}>
      <TopBar right={topRight} tone={tone} />
      <motion.section
        variants={stageContainer}
        initial="enter"
        animate="center"
        className={`flex flex-1 flex-col justify-between gap-0 overflow-y-auto px-6 screen-scroll ${stageClassName}`}
      >
        {children}
      </motion.section>
      {bottom ? <div className="px-6 shrink-0">{bottom}</div> : null}
    </div>
  );
}

/** Convenience re-export so screens can import from one place. */
export { StepPill };
