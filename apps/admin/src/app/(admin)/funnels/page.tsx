'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  GitBranchPlus,
  Users,
  TrendingUp,
  Trash2,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { PlusIcon, ChartFunnelIcon } from '@shopify/polaris-icons';
import { useFunnelStore, type SavedFunnel } from '@/stores/funnel-store';
import { Button, PageHeader } from '@earth-revibe/ui';

export default function FunnelsPage() {
  const funnels = useFunnelStore((s) => s.funnels);
  const deleteFunnel = useFunnelStore((s) => s.deleteFunnel);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const avgConversion =
    funnels.length > 0
      ? Math.round(
          (funnels.reduce((sum, f) => sum + (f.overallConversion ?? 0), 0) / funnels.length) * 10
        ) / 10
      : 0;

  const topFunnel = funnels.reduce<SavedFunnel | null>(
    (best, f) => (!best || (f.overallConversion ?? 0) > (best.overallConversion ?? 0) ? f : best),
    null
  );

  return (
    <div className="space-y-3">
      <PageHeader
        icon={ChartFunnelIcon}
        title="Funnels"
        subtitle="Build and monitor customer journey funnels"
        actions={
          <Link href="/funnels/create">
            <Button size="sm">
              <PlusIcon className="w-3.5 h-3.5 fill-current" />
              Create funnel
            </Button>
          </Link>
        }
      />

      {/* Stats overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <GitBranchPlus size={20} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Funnels</p>
              <p className="text-2xl font-bold text-text-primary">{funnels.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Avg Conversion</p>
              <p className="text-2xl font-bold text-text-primary">{avgConversion}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <BarChart3 size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Top Performer</p>
              <p className="text-lg font-bold text-text-primary truncate">
                {topFunnel?.name || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel list */}
      {funnels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
            <GitBranchPlus size={32} className="text-indigo-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-text-primary">No funnels yet</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Create your first funnel to start tracking customer journeys
          </p>
          <Link href="/funnels/create" className="mt-6">
            <Button>
              <Plus size={16} />
              Create Your First Funnel
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {funnels.map((funnel) => (
            <div
              key={funnel.id}
              className="group relative rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:shadow-lg"
            >
              {/* Delete confirmation overlay */}
              {deleteConfirm === funnel.id && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-surface/95 backdrop-blur-sm">
                  <p className="text-sm text-text-secondary">Delete this funnel?</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        deleteFunnel(funnel.id);
                        setDeleteConfirm(null);
                      }}
                    >
                      Delete
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">{funnel.name}</h3>
                  {funnel.description && (
                    <p className="mt-0.5 text-sm text-text-secondary line-clamp-1">
                      {funnel.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDeleteConfirm(funnel.id)}
                  className="ml-2 flex-shrink-0 rounded-lg p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Stats row */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-text-secondary">
                  <Users size={14} />
                  <span>{funnel.nodes.length} steps</span>
                </div>
                {funnel.overallConversion !== undefined && (
                  <div className="flex items-center gap-1 text-green-500">
                    <TrendingUp size={14} />
                    <span>{funnel.overallConversion}% conv.</span>
                  </div>
                )}
              </div>

              {/* Step preview */}
              <div className="mt-3 flex items-center gap-1 overflow-hidden">
                {funnel.nodes.slice(0, 5).map((node, i) => (
                  <div key={node.id} className="flex items-center gap-1">
                    {i > 0 && (
                      <ArrowRight size={10} className="text-text-secondary/30 flex-shrink-0" />
                    )}
                    <span
                      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-medium text-white/80 whitespace-nowrap"
                      style={{ backgroundColor: `${node.data.color}30`, color: node.data.color }}
                    >
                      {node.data.label}
                    </span>
                  </div>
                ))}
                {funnel.nodes.length > 5 && (
                  <span className="text-[10px] text-text-secondary">
                    +{funnel.nodes.length - 5}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-text-secondary">
                  Updated {new Date(funnel.updatedAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/funnels/${funnel.id}`}
                  className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Open <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
