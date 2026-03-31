'use client';

import { useEffect, useState, use } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Pencil, RefreshCw, Calendar } from 'lucide-react';
import { useFunnelStore } from '@/stores/funnel-store';
import { useFunnelAnalytics } from '@/hooks/use-funnel-analytics';
import { Button } from '@/components/ui';
import { FunnelStatsPanel } from '@/components/funnels/funnel-stats-panel';
import { NodeConfigPanel } from '@/components/funnels/node-config-panel';

// Dynamic import for canvas (heavy React Flow dependency — no SSR)
const FunnelCanvas = dynamic(
  () => import('@/components/funnels/funnel-canvas').then((m) => ({ default: m.FunnelCanvas })),
  { ssr: false, loading: () => <CanvasLoader /> }
);

function CanvasLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-[#0a0a1a] rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-white/30" />
        <span className="text-sm text-white/40">Loading canvas...</span>
      </div>
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FunnelEditorPage({ params }: PageProps) {
  const { id } = use(params);

  const loadFunnel = useFunnelStore((s) => s.loadFunnel);
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const renameFunnel = useFunnelStore((s) => s.renameFunnel);
  const funnels = useFunnelStore((s) => s.funnels);
  const activeFunnelId = useFunnelStore((s) => s.activeFunnelId);
  const isEditMode = useFunnelStore((s) => s.isEditMode);
  const setIsEditMode = useFunnelStore((s) => s.setIsEditMode);
  const selectedNodeId = useFunnelStore((s) => s.selectedNodeId);
  const dateRange = useFunnelStore((s) => s.dateRange);
  const setDateRange = useFunnelStore((s) => s.setDateRange);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const funnel = funnels.find((f) => f.id === id);

  // Load funnel on mount
  useEffect(() => {
    if (id && id !== activeFunnelId) {
      loadFunnel(id);
    }
  }, [id, activeFunnelId, loadFunnel]);

  // Fetch analytics data
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    refetch,
  } = useFunnelAnalytics(!isEditMode); // livePolling=true in Live Data mode

  const handleSave = () => {
    setIsSaving(true);
    saveFunnel();
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleRename = () => {
    if (editName.trim() && funnel) {
      renameFunnel(funnel.id, editName.trim());
    }
    setIsEditing(false);
  };

  if (!funnel) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <p className="text-text-secondary">Funnel not found</p>
        <Link href="/funnels" className="mt-4">
          <Button variant="secondary">
            <ArrowLeft size={16} /> Back to Funnels
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col -m-4 lg:-m-6">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/funnels"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors"
          >
            <ArrowLeft size={14} />
          </Link>

          {/* Editable funnel name */}
          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="rounded-md border border-accent bg-transparent px-2 py-1 text-lg font-bold text-text-primary outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setEditName(funnel.name);
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 text-lg font-bold text-text-primary hover:text-accent transition-colors"
            >
              {funnel.name}
              <Pencil size={12} className="text-text-secondary" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Date range */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary">
            <Calendar size={12} />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-transparent outline-none"
            />
            <span>→</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-transparent outline-none"
            />
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setIsEditMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                isEditMode ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => {
                setIsEditMode(false);
                refetch();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                !isEditMode ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Eye size={12} /> Live Data
            </button>
          </div>

          {/* Save */}
          <Button size="sm" onClick={handleSave} isLoading={isSaving}>
            <Save size={14} /> Save
          </Button>
        </div>
      </div>

      {/* Main content — canvas + side panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative">
          <FunnelCanvas />
        </div>

        {/* Right panel */}
        <div className="w-[340px] flex-shrink-0 overflow-y-auto border-l border-border bg-surface">
          {selectedNodeId && isEditMode ? (
            <NodeConfigPanel />
          ) : (
            <FunnelStatsPanel analytics={analytics} isLoading={isLoadingAnalytics} />
          )}
        </div>
      </div>
    </div>
  );
}
