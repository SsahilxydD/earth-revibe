"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = "", padding = true }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-light-gray ${padding ? "p-6" : ""} ${className}`}>
      {children}
    </div>
  );
}
