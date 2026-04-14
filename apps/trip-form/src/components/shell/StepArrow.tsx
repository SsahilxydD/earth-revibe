export function ArrowRight({
  className = '',
  stroke = 'currentColor',
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg viewBox="0 0 12 10" className={className} fill="none" aria-hidden>
      <path
        d="M0 5 H11 M6 1 L11 5 L6 9"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowLeft({
  className = '',
  stroke = 'currentColor',
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg viewBox="0 0 12 10" className={className} fill="none" aria-hidden>
      <path
        d="M12 5 H1 M6 1 L1 5 L6 9"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
