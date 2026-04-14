import type { Variants, Transition } from 'framer-motion';

/**
 * Page transition — horizontal slide + fade between screens.
 * Matches the handoff panel spec in trip.pen:
 *   push: x: 24 → 0, pop: x: -24 → 0
 *   duration 0.42s, ease cubicBezier(0.22, 1, 0.36, 1)
 */
export const pageVariants: Variants = {
  enter: (dir: 1 | -1) => ({
    x: dir * 24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: 1 | -1) => ({
    x: dir * -24,
    opacity: 0,
  }),
};

export const pageTransition: Transition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
};

/**
 * Stage content reveal — stagger children by 0.06s, each rising y: 12 → 0.
 * Wrap a Stage's StageContent with <motion.div variants={stageContainer}…>.
 */
export const stageContainer: Variants = {
  enter: {},
  center: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.06,
    },
  },
};

export const stageItem: Variants = {
  enter: { y: 12, opacity: 0 },
  center: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Tap feedback used on every interactive card + button. */
export const tapFeedback = {
  whileTap: { scale: 0.985 },
} as const;
