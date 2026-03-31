'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────

interface FunnelStep {
  label: string;
  userCount: number;
  conversionRate: number;
  color: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function getStepConversionFromFirst(userCount: number, firstStepCount: number): number {
  if (firstStepCount === 0) return 0;
  return (userCount / firstStepCount) * 100;
}

function getStepToStepRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current / previous) * 100;
}

// ── Custom tooltip ─────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  payload: {
    label: string;
    userCount: number;
    overallRate: number;
    stepRate: number | null;
    color: string;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-white/10 bg-[#12122a] px-4 py-3 shadow-xl">
      <p className="mb-1.5 text-sm font-semibold text-white">{data.label}</p>
      <div className="flex flex-col gap-1 text-xs text-white/70">
        <span>Users: {data.userCount.toLocaleString('en-US')}</span>
        <span>Overall: {data.overallRate.toFixed(1)}%</span>
        {data.stepRate !== null && <span>From prev step: {data.stepRate.toFixed(1)}%</span>}
      </div>
    </div>
  );
}

// ── Connector arrows between bars ──────────────────────────────────────────

function StepConnectors({ steps }: { steps: FunnelStep[] }) {
  if (steps.length < 2) return null;

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        if (i === 0) return <div key={step.label} className="h-[52px]" />;

        const rate = getStepToStepRate(step.userCount, steps[i - 1].userCount);
        const isHealthy = rate > 50;
        const isWarning = rate > 20 && rate <= 50;

        return (
          <div key={step.label} className="flex h-[52px] items-center justify-center">
            <div className="flex flex-col items-center gap-0.5">
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path
                  d="M8 0L8 8M4 5L8 9L12 5"
                  stroke={isHealthy ? '#22c55e' : isWarning ? '#eab308' : '#ef4444'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className={[
                  'text-[10px] font-medium',
                  isHealthy ? 'text-green-400' : isWarning ? 'text-yellow-400' : 'text-red-400',
                ].join(' ')}
              >
                {rate.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Custom bar label ───────────────────────────────────────────────────────

function BarLabel(props: Record<string, unknown>) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const value = Number(props.value ?? 0);

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#ffffff"
      fontSize={12}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {formatNumber(value)}
    </text>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export { type FunnelChartProps, FunnelChart };

export default function FunnelChart({ steps }: FunnelChartProps) {
  const chartData = useMemo(() => {
    if (!steps.length) return [];

    const firstCount = steps[0].userCount;

    return steps.map((step, i) => ({
      label: step.label,
      userCount: step.userCount,
      color: step.color,
      overallRate: getStepConversionFromFirst(step.userCount, firstCount),
      stepRate: i > 0 ? getStepToStepRate(step.userCount, steps[i - 1].userCount) : null,
    }));
  }, [steps]);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!steps.length) {
    return (
      <div className="flex h-[360px] w-full items-center justify-center rounded-xl border border-white/10 bg-[#1a1a2e]">
        <div className="flex flex-col items-center gap-2 text-white/40">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="M7 16l4-4 4 4 4-8" />
          </svg>
          <p className="text-sm font-medium">No data yet</p>
          <p className="text-xs text-white/25">Funnel data will appear once events are tracked.</p>
        </div>
      </div>
    );
  }

  // ── Chart ────────────────────────────────────────────────────────────────

  const firstCount = steps[0].userCount;

  return (
    <div className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] p-4">
      <div className="flex gap-2">
        {/* Connector arrows column */}
        <StepConnectors steps={steps} />

        {/* Chart area */}
        <div className="min-w-0 flex-1">
          <ResponsiveContainer width="100%" height={steps.length * 52 + 16}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 80, left: 8, bottom: 8 }}
              barCategoryGap="16%"
            >
              <defs>
                {chartData.map((entry) => (
                  <linearGradient
                    key={`grad-${entry.label}`}
                    id={`grad-${entry.label.replace(/\s+/g, '-')}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.35} />
                  </linearGradient>
                ))}
              </defs>

              <XAxis type="number" hide domain={[0, firstCount || 1]} />

              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{
                  fontSize: 12,
                  fill: '#ffffff',
                  fontWeight: 500,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />

              <Bar dataKey="userCount" radius={[0, 6, 6, 0]} maxBarSize={36} label={<BarLabel />}>
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={`url(#grad-${entry.label.replace(/\s+/g, '-')})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion % column */}
        <div className="flex flex-col">
          {chartData.map((entry) => (
            <div key={entry.label} className="flex h-[52px] items-center justify-end">
              <span
                className={[
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  entry.overallRate > 50
                    ? 'bg-green-500/20 text-green-400'
                    : entry.overallRate > 20
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400',
                ].join(' ')}
              >
                {entry.overallRate.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
