import { cn } from '@/lib/utils';

type BadgeVariant = 'sale' | 'soldOut' | 'new' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  sale: 'bg-[var(--color-sale)] text-white',
  soldOut: 'bg-[var(--color-sold-out)] text-white',
  new: 'bg-[var(--color-primary)] text-white',
  default: 'bg-[var(--color-surface)] text-[var(--color-text)]',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-[var(--badge-radius)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
