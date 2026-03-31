'use client';

import { useMemo } from 'react';
import { Users, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useFunnelStore } from '@/stores/funnel-store';
import { FunnelChart } from './funnel-chart';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

// ── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  iconColor: string;
}

function StatCard({ label, value, change, icon: Icon, iconColor }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a2e] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-white/50">{label}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon size={16} style={{ color: iconColor }} />
        </div>
      </div>

      <p className="text-2xl font-bold text-white">{value}</p>

      {change !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? (
            <TrendingUp size={14} className="text-green-400" />
          ) : (
            <TrendingDown size={14} className="text-red-400" />
          )}
          <span className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}
            {formatRate(change)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Step Breakdown Item ──────────────────────────────────────────────────────

interface StepItemProps {
  label: string;
  userCount: number;
  conversionRate: number;
  color: string;
  isLast: boolean;
}

function StepItem({ label, userCount, conversionRate, color, isLast }: StepItemProps) {
  return (
    <div className="group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">{formatNumber(userCount)} users</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              conversionRate > 50
                ? 'bg-green-500/20 text-green-400'
                : conversionRate > 20
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            }`}
          >
            {formatRate(conversionRate)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 ml-[18px] h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(conversionRate, 2)}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="ml-[18px] flex items-center py-1.5 text-white/20">
          <ArrowRight size={12} />
        </div>
      )}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface FunnelStatsPanelProps {
  analytics?: unknown;
  isLoading?: boolean;
}

export function FunnelStatsPanel(_props?: FunnelStatsPanelProps) {
  const nodes = useFunnelStore((s) => s.nodes);

  const stats = useMemo(() => {
    if (nodes.length === 0) {
      return {
        totalEntries: 0,
        totalCompletions: 0,
        overallConversion: 0,
        biggestDropOff: null as { label: string; dropOff: number } | null,
      };
    }

    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const entries = firstNode.data.userCount ?? 0;
    const completions = lastNode.data.userCount ?? 0;
    const overallConversion = entries > 0 ? (completions / entries) * 100 : 0;

    // Find the step with the highest drop-off
    let biggestDropOff: { label: string; dropOff: number } | null = null;
    for (const node of nodes) {
      const dropOff = node.data.dropOff ?? 0;
      if (dropOff > 0 && (!biggestDropOff || dropOff > biggestDropOff.dropOff)) {
        biggestDropOff = { label: node.data.label, dropOff };
      }
    }

    return {
      totalEntries: entries,
      totalCompletions: completions,
      overallConversion,
      biggestDropOff,
    };
  }, [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-center text-sm text-white/40">
          Add steps to your funnel to see analytics
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Funnel Analytics</h2>
        <p className="mt-0.5 text-xs text-white/40">Performance overview</p>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* Stats cards grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Entries"
            value={formatNumber(stats.totalEntries)}
            icon={Users}
            iconColor="#6366f1"
          />
          <StatCard
            label="Completions"
            value={formatNumber(stats.totalCompletions)}
            icon={TrendingUp}
            iconColor="#22c55e"
          />
          <StatCard
            label="Conversion"
            value={formatRate(stats.overallConversion)}
            change={stats.overallConversion}
            icon={TrendingUp}
            iconColor="#3b82f6"
          />
          <StatCard
            label="Biggest Drop"
            value={stats.biggestDropOff ? formatRate(stats.biggestDropOff.dropOff) : '—'}
            change={stats.biggestDropOff ? -stats.biggestDropOff.dropOff : undefined}
            icon={TrendingDown}
            iconColor="#ef4444"
          />
        </div>

        {/* Biggest drop-off label */}
        {stats.biggestDropOff && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            Highest drop-off at <strong>{stats.biggestDropOff.label}</strong> (
            {formatRate(stats.biggestDropOff.dropOff)})
          </p>
        )}

        {/* Funnel chart */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Funnel Visualization
          </h3>
          <div className="rounded-xl border border-white/10 bg-[#1a1a2e] p-3">
            <FunnelChart
              steps={nodes.map((node) => ({
                label: node.data.label as string,
                userCount: (node.data.userCount as number) ?? 0,
                conversionRate: (node.data.conversionRate as number) ?? 0,
                color: (node.data.color as string) ?? '#6366f1',
              }))}
            />
          </div>
        </div>

        {/* Step breakdown */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
            Step Breakdown
          </h3>
          <div className="space-y-1">
            {nodes.map((node, idx) => (
              <StepItem
                key={node.id}
                label={node.data.label}
                userCount={node.data.userCount ?? 0}
                conversionRate={node.data.conversionRate ?? 0}
                color={node.data.color ?? '#6366f1'}
                isLast={idx === nodes.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FunnelStatsPanel;
