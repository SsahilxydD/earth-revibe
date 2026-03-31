'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { STEP_TEMPLATES, type FunnelStepType } from '@/stores/funnel-store';

// ── Icon mapping ────────────────────────────────────────────────────────────

const ICON_MAP: Record<
  FunnelStepType,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  trigger: Zap,
  page_visit: Globe,
  view_item: Eye,
  add_to_cart: ShoppingCart,
  begin_checkout: CreditCard,
  purchase: CheckCircle,
  remove_from_cart: ShoppingCart,
  search: Search,
  custom_event: Sparkles,
};

// ── Props ───────────────────────────────────────────────────────────────────

interface NodePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: FunnelStepType) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function NodePicker({ isOpen, onClose, onSelect }: NodePickerProps) {
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Small delay so the DOM is painted before focusing
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use a timeout so the opening click doesn't immediately close the panel
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSelect = useCallback(
    (type: FunnelStepType) => {
      onSelect(type);
      onClose();
    },
    [onSelect, onClose]
  );

  if (!isOpen) return null;

  // Filter step types by search query
  const stepTypes = (Object.keys(STEP_TEMPLATES) as FunnelStepType[]).filter((type) => {
    if (!query.trim()) return true;
    const template = STEP_TEMPLATES[type];
    const lowerQuery = query.toLowerCase();
    return (
      template.label.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.eventName.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <div
      ref={panelRef}
      className="w-full max-w-[380px] rounded-xl border border-white/10 bg-[#12122a] shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Add Step</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search steps..."
            className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
          />
        </div>
      </div>

      {/* Step grid */}
      <div className="max-h-[360px] overflow-y-auto p-2">
        {stepTypes.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/30">No steps match your search</p>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {stepTypes.map((type) => {
              const template = STEP_TEMPLATES[type];
              const Icon = ICON_MAP[type];

              return (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className="group flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  {/* Color accent bar */}
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: template.color }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {/* Left color accent */}
                      <div
                        className="h-3 w-0.5 shrink-0 rounded-full"
                        style={{ backgroundColor: template.color }}
                      />
                      <span className="truncate text-sm font-medium text-white/90 group-hover:text-white">
                        {template.label}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-[calc(0.125rem+0.5rem)] text-xs text-white/40 group-hover:text-white/50">
                      {template.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
