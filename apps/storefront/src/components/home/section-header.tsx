import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel = 'View All',
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 md:mb-8">
      <h2 className="text-sm md:text-base font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
        {title}
      </h2>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-xs md:text-sm uppercase tracking-wider text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-primary)] transition-colors"
        >
          {viewAllLabel}
        </Link>
      )}
    </div>
  );
}
