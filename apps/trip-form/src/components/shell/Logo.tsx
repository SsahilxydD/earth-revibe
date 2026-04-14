type Tone = 'ink' | 'paper';

export function Logo({ tone = 'ink' }: { tone?: Tone }) {
  const color = tone === 'paper' ? 'text-paper' : 'text-ink';
  const ringBorder = tone === 'paper' ? 'border-paper' : 'border-ink';
  return (
    <div className="flex items-center gap-[10px]">
      <span aria-hidden className={`block size-[18px] rounded-full border-[4px] ${ringBorder}`} />
      <span className={`${color} font-sans text-[11px] font-bold tracking-[0.27em]`}>
        EARTH&nbsp;&nbsp;REVIBE
      </span>
    </div>
  );
}
