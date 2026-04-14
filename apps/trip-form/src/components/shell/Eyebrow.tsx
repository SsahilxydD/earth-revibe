import { motion } from 'framer-motion';
import { stageItem } from '@/lib/motion';

type Tone = 'ink' | 'clay' | 'wa';

const toneMap: Record<Tone, { bar: string; text: string }> = {
  ink: { bar: 'bg-ink', text: 'text-ink' },
  clay: { bar: 'bg-clay', text: 'text-clay' },
  wa: { bar: 'bg-wa', text: 'text-ink' },
};

export function Eyebrow({ children, tone = 'ink' }: { children: React.ReactNode; tone?: Tone }) {
  const t = toneMap[tone];
  return (
    <motion.div variants={stageItem} className="flex items-center gap-[10px]">
      <span aria-hidden className={`block h-px w-6 ${t.bar}`} />
      <span className={`font-sans text-[11px] font-bold tracking-[0.14em] ${t.text}`}>
        {children}
      </span>
    </motion.div>
  );
}
