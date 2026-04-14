import { motion } from 'framer-motion';
import { tapFeedback } from '@/lib/apply/motion';

type Props = {
  letter?: string; // "A", "B", "C", "D"
  title: string;
  subtitle?: string;
  selected: boolean;
  onSelect: () => void;
};

/** Large rounded option card used on the Traveler Type screen + similar. */
export function ChoiceCard({ letter, title, subtitle, selected, onSelect }: Props) {
  const bg = selected ? 'bg-ink' : 'bg-transparent';
  const border = selected ? 'border-ink' : 'border-hairline';
  const titleColor = selected ? 'text-paper' : 'text-ink';
  const subColor = selected ? 'text-paper/60' : 'text-muted';
  const letterColor = selected ? 'text-dim' : 'text-dim';
  const radio = selected ? 'bg-clay border-clay ring-[3px] ring-inset ring-paper/90' : 'border-ink';
  return (
    <motion.button
      {...tapFeedback}
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex w-full items-center gap-[14px] rounded-2xl border px-[18px] py-[16px] text-left transition-colors ${bg} ${border}`}
    >
      {letter ? (
        <span className={`font-display text-[13px] font-normal tracking-[0.03em] ${letterColor}`}>
          {letter}
        </span>
      ) : null}
      <span className="flex-1 min-w-0">
        <span
          className={`block font-display text-[18px] font-light leading-tight -tracking-[0.015em] ${titleColor}`}
        >
          {title}
        </span>
        {subtitle ? (
          <span className={`mt-[2px] block font-sans text-[11px] font-normal ${subColor}`}>
            {subtitle}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={`grid size-[18px] shrink-0 place-items-center rounded-full border ${radio}`}
      />
    </motion.button>
  );
}

/** Tall stacked Yes/No card used on the Past Travel screen. */
export function YesNoCard({
  title,
  subtitle,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const bg = selected ? 'bg-ink' : 'bg-transparent';
  const border = selected ? 'border-ink' : 'border-hairline';
  const titleColor = selected ? 'text-paper' : 'text-ink';
  const subColor = selected ? 'text-paper/60' : 'text-muted';
  const radio = selected ? 'bg-clay border-clay ring-[3px] ring-inset ring-paper/90' : 'border-ink';
  return (
    <motion.button
      {...tapFeedback}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-24 w-full items-center justify-between gap-[14px] rounded-[20px] border px-[22px] text-left transition-colors ${bg} ${border}`}
    >
      <span>
        <span
          className={`block font-display text-[22px] font-light -tracking-[0.018em] ${titleColor}`}
        >
          {title}
        </span>
        <span className={`mt-[2px] block font-sans text-[11px] font-normal ${subColor}`}>
          {subtitle}
        </span>
      </span>
      <span
        aria-hidden
        className={`grid size-[22px] shrink-0 place-items-center rounded-full border ${radio}`}
      />
    </motion.button>
  );
}

/** Half-width tile option used on the Curated screen. */
export function SplitCard({
  title,
  subtitle,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const bg = selected ? 'bg-ink' : 'bg-transparent';
  const border = selected ? 'border-ink' : 'border-hairline';
  const titleColor = selected ? 'text-paper' : 'text-ink';
  const subColor = selected ? 'text-paper/60' : 'text-muted';
  return (
    <motion.button
      {...tapFeedback}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-24 flex-1 flex-col items-center justify-center gap-[4px] rounded-[20px] border px-3 text-center transition-colors ${bg} ${border}`}
    >
      <span className={`font-display text-[22px] font-light -tracking-[0.018em] ${titleColor}`}>
        {title}
      </span>
      <span className={`font-sans text-[11px] font-normal ${subColor}`}>{subtitle}</span>
    </motion.button>
  );
}

/** Pill-height option used on the 3-way Meet-Before segmented list. */
export function PillChoice({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const bg = selected ? 'bg-ink' : 'bg-transparent';
  const border = selected ? 'border-ink' : 'border-hairline';
  const textColor = selected ? 'text-paper' : 'text-ink';
  const radio = selected ? 'bg-clay border-clay ring-[3px] ring-inset ring-paper/90' : 'border-ink';
  return (
    <motion.button
      {...tapFeedback}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-[72px] w-full items-center justify-between rounded-[18px] border px-[22px] transition-colors ${bg} ${border}`}
    >
      <span className={`font-display text-[18px] font-light -tracking-[0.016em] ${textColor}`}>
        {label}
      </span>
      <span
        aria-hidden
        className={`grid size-[20px] place-items-center rounded-full border ${radio}`}
      />
    </motion.button>
  );
}
