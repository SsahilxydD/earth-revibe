import type { ReactNode } from 'react';
import { Logo } from './Logo';

type TopBarProps = {
  /** Right-side pill (step number, gate label, submitted badge, etc.) */
  right?: ReactNode;
  tone?: 'ink' | 'paper';
};

export function TopBar({ right, tone = 'ink' }: TopBarProps) {
  return (
    <header className="h-16 shrink-0 px-6 pt-[22px] flex items-center justify-between">
      <Logo tone={tone} />
      {right}
    </header>
  );
}

/** Standard dark step pill used on question screens (e.g. "04 / 10"). */
export function StepPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ink px-3 py-[6px] font-display text-[11px] font-normal tracking-[0.03em] text-paper">
      {label}
    </span>
  );
}

/** Outlined pill used on the phone gate + OTP screens. */
export function GatePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full border border-ink/20 bg-ink/5 px-[10px] py-[6px] font-sans text-[10px] font-bold tracking-[0.14em] text-ink">
      <span aria-hidden>🔒</span>
      {label}
    </span>
  );
}

/** Submitted-state badge used on the final screen. */
export function SubmittedPill() {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full bg-clay px-3 py-[6px] font-sans text-[10px] font-bold tracking-[0.14em] text-paper">
      <span aria-hidden className="block size-[6px] rounded-full bg-paper" />
      SUBMITTED
    </span>
  );
}
