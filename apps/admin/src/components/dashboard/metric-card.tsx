'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  prefix?: string;
}

export function MetricCard({ title, value, change, prefix }: MetricCardProps) {
  const isPositive = change >= 0;
  const changeText = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;

  return (
    <div className="bg-white rounded-xl border border-light-gray p-5 hover:shadow-sm transition-shadow">
      <p className="text-xs font-medium text-medium-gray uppercase tracking-wide">{title}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-semibold text-charcoal leading-none">
          {prefix}
          {value}
        </p>
        {change !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              isPositive ? 'text-success' : 'text-error'
            }`}
          >
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {changeText}
          </span>
        )}
      </div>
    </div>
  );
}
