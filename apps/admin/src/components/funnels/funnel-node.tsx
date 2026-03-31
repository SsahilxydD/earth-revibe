'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  Zap,
  Globe,
  Search,
  X,
  Sparkles,
  Users,
} from 'lucide-react';
import type { FunnelNodeData, FunnelStepType } from '@/stores/funnel-store';

// ── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<FunnelStepType, React.ElementType> = {
  trigger: Zap,
  page_visit: Globe,
  view_item: Eye,
  add_to_cart: ShoppingCart,
  begin_checkout: CreditCard,
  purchase: CheckCircle,
  remove_from_cart: X,
  search: Search,
  custom_event: Sparkles,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function getConversionBadgeClasses(rate: number): string {
  if (rate > 50) return 'bg-green-500/20 text-green-400';
  if (rate > 20) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

// ── Component ───────────────────────────────────────────────────────────────

type FunnelNode = Node<FunnelNodeData>;

function FunnelNodeComponent({ data, selected }: NodeProps<FunnelNode>) {
  const Icon = ICON_MAP[data.type] ?? Sparkles;
  const accentColor = data.color ?? '#6366f1';
  const hasMetrics = data.userCount !== undefined || data.conversionRate !== undefined;

  return (
    <div
      className={[
        'relative flex min-w-[220px] overflow-hidden rounded-xl border bg-[#1a1a2e] shadow-lg',
        'transition-all duration-200 ease-out',
        'hover:scale-[1.02] hover:border-white/25',
        selected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-white/10',
      ].join(' ')}
    >
      {/* Left accent bar */}
      <div className="w-1 shrink-0" style={{ backgroundColor: accentColor }} />

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Header: icon + label */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Icon size={16} style={{ color: accentColor }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{data.label}</p>
            {data.description && (
              <p className="truncate text-xs text-white/50">{data.description}</p>
            )}
          </div>
        </div>

        {/* Metrics row */}
        {hasMetrics && (
          <div className="flex items-center gap-2 pt-1">
            {data.userCount !== undefined && (
              <div className="flex items-center gap-1 text-xs text-white/60">
                <Users size={12} />
                <span>{formatNumber(data.userCount)}</span>
              </div>
            )}
            {data.conversionRate !== undefined && (
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  getConversionBadgeClasses(data.conversionRate),
                ].join(' ')}
              >
                {data.conversionRate.toFixed(1)}%
              </span>
            )}
          </div>
        )}

        {/* Drop-off indicator */}
        {data.dropOff !== undefined && data.dropOff > 0 && (
          <p className="text-xs text-red-400">↓ {data.dropOff.toFixed(1)}% drop-off</p>
        )}
      </div>

      {/* Handles */}
      {data.type !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !rounded-full !border-2 !border-white/20 !bg-white/10"
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2 !border-white/20 !bg-white/10"
      />
    </div>
  );
}

export const FunnelNode = memo(FunnelNodeComponent);
export default FunnelNode;
