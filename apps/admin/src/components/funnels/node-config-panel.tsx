'use client';

import { useCallback } from 'react';
import { Trash2, Settings, Palette } from 'lucide-react';
import { useFunnelStore, type FunnelNodeData } from '@/stores/funnel-store';

// ── Preset Colors ────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#22c55e', // green
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
];

// ── Main Panel ───────────────────────────────────────────────────────────────

export function NodeConfigPanel() {
  const nodes = useFunnelStore((s) => s.nodes);
  const selectedNodeId = useFunnelStore((s) => s.selectedNodeId);
  const updateNodeData = useFunnelStore((s) => s.updateNodeData);
  const removeNode = useFunnelStore((s) => s.removeNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleUpdate = useCallback(
    (field: keyof FunnelNodeData, value: string) => {
      if (!selectedNodeId) return;
      updateNodeData(selectedNodeId, { [field]: value });
    },
    [selectedNodeId, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    if (!selectedNodeId) return;
    removeNode(selectedNodeId);
  }, [selectedNodeId, removeNode]);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!selectedNode) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Settings size={20} className="text-white/30" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white/50">No node selected</p>
          <p className="mt-1 text-xs text-white/30">Select a node to configure</p>
        </div>
      </div>
    );
  }

  const { data } = selectedNode;

  // ── Panel content ────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Settings size={16} className="text-white/50" />
        <div>
          <h2 className="text-sm font-semibold text-white">Node Settings</h2>
          <p className="text-xs text-white/40">Configure step properties</p>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* Node type indicator */}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: data.color ?? '#6366f1' }}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-white/60">
            {data.type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Label input */}
        <div>
          <label htmlFor="node-label" className="mb-1.5 block text-xs font-medium text-white/60">
            Display Label
          </label>
          <input
            id="node-label"
            type="text"
            value={data.label}
            onChange={(e) => handleUpdate('label', e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            placeholder="Step name"
          />
        </div>

        {/* Event name input */}
        <div>
          <label htmlFor="node-event" className="mb-1.5 block text-xs font-medium text-white/60">
            Event Name
          </label>
          <input
            id="node-event"
            type="text"
            value={data.eventName}
            onChange={(e) => handleUpdate('eventName', e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-white placeholder-white/30 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            placeholder="event_name"
          />
        </div>

        {/* Description textarea */}
        <div>
          <label
            htmlFor="node-description"
            className="mb-1.5 block text-xs font-medium text-white/60"
          >
            Description
          </label>
          <textarea
            id="node-description"
            value={data.description ?? ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            placeholder="Describe what this step tracks..."
          />
        </div>

        {/* Color picker */}
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Palette size={14} className="text-white/50" />
            <span className="text-xs font-medium text-white/60">Accent Color</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => {
              const isActive = data.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleUpdate('color', color)}
                  className={`h-7 w-7 rounded-lg border-2 transition-all ${
                    isActive
                      ? 'scale-110 border-white/60'
                      : 'border-transparent hover:scale-105 hover:border-white/20'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete button — pinned to bottom */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={handleDelete}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/20"
        >
          <Trash2 size={16} />
          Delete Node
        </button>
      </div>
    </div>
  );
}

export default NodeConfigPanel;
