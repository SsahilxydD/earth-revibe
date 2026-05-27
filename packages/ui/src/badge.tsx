'use client';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

// Polaris badges are small rounded pills with a dot indicator (we approximate
// without the dot here — just the muted bg + readable text). Colors lifted from
// Polaris `bg-fill-{tone}-secondary` tokens.
const variantStyles = {
  default: 'bg-[#e3e3e3] text-[#303030]',
  success: 'bg-[#cdfed4] text-[#0c5132]',
  warning: 'bg-[#ffe9a8] text-[#5a3c00]',
  error: 'bg-[#fed3d1] text-[#8e1f0b]',
  info: 'bg-[#d5edff] text-[#003a73]',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[12px] font-medium leading-tight ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
