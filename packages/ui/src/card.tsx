'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

// Polaris card: white surface, 12px rounded corner, hairline 1px border via
// inset shadow + a very soft drop shadow for elevation. No outer border so
// nested cards/inputs don't double-up.
export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] ${padding ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
