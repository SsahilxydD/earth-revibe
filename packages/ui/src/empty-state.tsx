'use client';

interface EmptyStateProps {
  // Optional illustration above the heading (typically an emoji or icon SVG).
  illustration?: React.ReactNode;
  heading: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  // Optional secondary link below the action (Shopify's "Learn more about X").
  footerLink?: React.ReactNode;
}

// Polaris empty state — full-width white card with centered content.
export function EmptyState({ illustration, heading, body, action, footerLink }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] py-12 px-6 flex flex-col items-center text-center">
      {illustration && <div className="mb-4">{illustration}</div>}
      <h2 className="text-[14px] font-semibold text-[#303030]">{heading}</h2>
      {body && (
        <div className="mt-1.5 text-[13px] text-[#616161] max-w-md leading-relaxed">{body}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
      {footerLink && (
        <div className="mt-4 text-[12px] text-[#005bd3] hover:underline">{footerLink}</div>
      )}
    </div>
  );
}
