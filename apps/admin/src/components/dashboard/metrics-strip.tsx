'use client';

import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Metric {
  label: string;
  value: string;
  change: number;
  sparkline?: number[];
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 52;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricsStrip({ metrics }: { metrics: Metric[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? metrics : metrics.slice(0, 4);

  return (
    <div className="bg-white rounded-xl border border-light-gray">
      <div className="flex items-stretch divide-x divide-light-gray">
        {visible.map((m) => {
          const isPositive = m.change >= 0;
          const changeColor = isPositive ? '#16A34A' : '#DC2626';
          const sparkData = m.sparkline || generateSparkline(m.change);

          return (
            <div key={m.label} className="flex-1 px-4 py-3 min-w-0">
              <p className="text-xs text-medium-gray font-medium truncate">{m.label}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-base font-semibold text-charcoal truncate">{m.value}</span>
                <Sparkline data={sparkData} color={changeColor} />
                {m.change !== 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium whitespace-nowrap"
                    style={{ color: changeColor }}
                  >
                    {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(m.change).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Expand/collapse toggle */}
        {metrics.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 flex items-center justify-center text-medium-gray hover:text-dark-gray transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function generateSparkline(change: number): number[] {
  const points = 8;
  const data: number[] = [];
  let val = 10;
  for (let i = 0; i < points; i++) {
    val += (change > 0 ? 1 : -1) * (Math.random() * 3) + (change > 0 ? 0.5 : -0.5);
    data.push(Math.max(0, val));
  }
  return data;
}
