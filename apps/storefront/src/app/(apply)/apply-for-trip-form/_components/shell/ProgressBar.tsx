import { motion } from 'framer-motion';
import { TOTAL_QUESTIONS } from '@/lib/apply/flow';

export function ProgressBar({ filled }: { filled: number }) {
  const count = TOTAL_QUESTIONS;
  return (
    <div
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={count}
      className="flex h-1 w-full items-stretch gap-1"
    >
      {Array.from({ length: count }).map((_, i) => {
        const on = i < filled;
        return (
          <motion.span
            key={i}
            layout
            initial={false}
            animate={{ backgroundColor: on ? '#1a1714' : '#d9cfbc' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 rounded-full"
          />
        );
      })}
    </div>
  );
}
