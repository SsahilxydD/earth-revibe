import { motion } from 'framer-motion';
import { tapFeedback } from '@/lib/motion';

type Props = {
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: () => void;
};

export function CheckboxCard({ title, subtitle, checked, onToggle }: Props) {
  const frame = checked ? 'bg-ink border-transparent' : 'bg-transparent border-hairline';
  const titleColor = checked ? 'text-paper' : 'text-ink';
  const subColor = checked ? 'text-paper/60' : 'text-muted';
  const box = checked ? 'bg-clay border-clay' : 'bg-transparent border-ink';

  return (
    <motion.button
      {...tapFeedback}
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center gap-[14px] rounded-[14px] border px-[16px] py-[16px] pr-[18px] text-left transition-colors ${frame}`}
    >
      <span
        aria-hidden
        className={`grid size-[22px] shrink-0 place-items-center rounded-md border-[1.5px] ${box}`}
      >
        {checked ? (
          <svg viewBox="0 0 12 9" className="h-[9px] w-3" fill="none" aria-hidden>
            <path
              d="M0.5 4.8 L4.2 8.2 L11.3 0.6"
              stroke="#f2ede3"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block font-display text-[18px] font-light -tracking-[0.016em] ${titleColor}`}
        >
          {title}
        </span>
        <span className={`mt-[2px] block font-sans text-[11px] font-normal ${subColor}`}>
          {subtitle}
        </span>
      </span>
    </motion.button>
  );
}
