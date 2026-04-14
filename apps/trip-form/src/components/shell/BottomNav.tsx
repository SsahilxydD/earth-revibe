import { motion } from 'framer-motion';
import { useFlow } from '@/lib/store';
import { QUESTION_INDEX } from '@/lib/flow';
import { ProgressBar } from './ProgressBar';
import { ArrowLeft, ArrowRight } from './StepArrow';
import { tapFeedback } from '@/lib/motion';

type Props = {
  /** Override the primary CTA label (defaults to "Continue"). */
  nextLabel?: string;
  /** Hide the back button (used on first question). */
  hideBack?: boolean;
  /** Disable the next CTA until the user answers. */
  nextDisabled?: boolean;
  /** Custom handler — default advances the flow. */
  onNext?: () => void;
  /** Pending state (spinner on CTA, disables tap). */
  pending?: boolean;
  /** Swap the next button's background to clay (used on final submit). */
  tone?: 'ink' | 'clay';
};

export function BottomNav({
  nextLabel = 'Continue',
  hideBack = false,
  nextDisabled = false,
  onNext,
  pending = false,
  tone = 'ink',
}: Props) {
  const step = useFlow((s) => s.step);
  const goNext = useFlow((s) => s.goNext);
  const goBack = useFlow((s) => s.goBack);

  const filled = QUESTION_INDEX[step] ?? 0;
  const handleNext = () => {
    if (nextDisabled || pending) return;
    onNext ? onNext() : goNext();
  };

  const nextBg = tone === 'clay' ? 'bg-clay' : 'bg-ink';
  const nextArrowBg = tone === 'clay' ? 'bg-ink' : 'bg-clay';

  return (
    <div className="flex flex-col gap-[18px] pb-8">
      <ProgressBar filled={filled} />
      <div className="flex items-center justify-between gap-3">
        {!hideBack ? (
          <motion.button
            {...tapFeedback}
            onClick={goBack}
            aria-label="Go back"
            className="grid size-14 shrink-0 place-items-center rounded-full border border-ink text-ink"
          >
            <ArrowLeft className="h-[10px] w-3" />
          </motion.button>
        ) : (
          <span className="size-14 shrink-0" />
        )}
        <motion.button
          {...tapFeedback}
          onClick={handleNext}
          disabled={nextDisabled || pending}
          className={`group relative flex h-14 flex-1 items-center justify-between gap-[10px] rounded-full pl-[26px] pr-[6px] text-paper transition-opacity ${nextBg} ${
            nextDisabled ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <span className="font-sans text-[14px] font-semibold -tracking-[0.005em]">
            {pending ? 'Just a sec…' : nextLabel}
          </span>
          <span className={`grid size-[44px] place-items-center rounded-full ${nextArrowBg}`}>
            {pending ? (
              <span className="block size-[14px] animate-spin rounded-full border-[1.5px] border-paper border-t-transparent" />
            ) : (
              <ArrowRight
                className="h-[10px] w-3 transition-transform group-hover:translate-x-[2px]"
                stroke="#f2ede3"
              />
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
