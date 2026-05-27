'use client';

import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';

interface PageHeaderProps {
  // Optional small back link above the title — Shopify uses this when you're
  // inside a detail page ("← Orders" above "Order #1023").
  backHref?: string;
  backLabel?: string;
  // Optional small section icon shown before the title.
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  // Optional subtle subtitle below the title (e.g. "12 results").
  subtitle?: string;
  // Right-aligned action buttons / dropdowns. Rendered as a flex row.
  actions?: React.ReactNode;
}

// Polaris page header pattern lifted from admin.shopify.com:
//   18px / 600 / #303030 title, 24px line-height
//   Title row OUTSIDE any card, sits on the page bg directly
//   Actions right-aligned, small (h-8) with subtle gray bg
export function PageHeader({
  backHref,
  backLabel,
  icon: Icon,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-4">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 mb-1 text-[12px] text-[#616161] hover:text-[#303030]"
        >
          <svg viewBox="0 0 20 20" className="w-3 h-3 fill-current">
            <path d="m11.78 5.22a.75.75 0 0 1 0 1.06l-2.97 2.97h7.44a.75.75 0 0 1 0 1.5h-7.44l2.97 2.97a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0z" />
          </svg>
          {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-5 h-5 fill-[#303030] flex-shrink-0" />}
          <h1 className="text-[18px] font-semibold leading-6 text-[#303030] truncate">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {subtitle && <p className="text-[13px] text-[#616161] mt-1">{subtitle}</p>}
    </div>
  );
}
