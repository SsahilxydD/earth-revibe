'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, X } from 'lucide-react';
import { Card, Button, Badge, Input } from '@earth-revibe/ui';
import { Modal } from '@earth-revibe/ui/modal';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import {
  SEGMENT_FIELDS,
  SEGMENT_OPS,
  type CustomerSegmentInput,
  type CustomerSegmentRow,
  type SegmentField,
  type SegmentFilter,
  type SegmentOp,
} from '@earth-revibe/shared';
import {
  useCustomerSegments,
  useCreateCustomerSegment,
  useUpdateCustomerSegment,
  useDeleteCustomerSegment,
  useRefreshCustomerSegment,
} from '@/hooks/use-customer-segments';

const FIELD_LABELS: Record<SegmentField, string> = {
  totalSpent: 'Total spent (₹)',
  orderCount: 'Order count',
  lastOrderDaysAgo: 'Days since last order',
  accountAgeDays: 'Account age (days)',
  loyaltyPoints: 'Loyalty points',
  hasPhone: 'Has phone',
  hasOrders: 'Has placed an order',
};

const OP_LABELS: Record<SegmentOp, string> = {
  eq: '=',
  gte: '≥',
  lte: '≤',
};

const NUMBER_FIELDS: SegmentField[] = [
  'totalSpent',
  'orderCount',
  'lastOrderDaysAgo',
  'accountAgeDays',
  'loyaltyPoints',
];
const BOOLEAN_FIELDS: SegmentField[] = ['hasPhone', 'hasOrders'];

interface FormState {
  name: string;
  filters: SegmentFilter[];
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  filters: [{ field: 'totalSpent', op: 'gte', value: 1000 }],
  isActive: true,
};

function rowToForm(r: CustomerSegmentRow): FormState {
  return {
    name: r.name,
    filters: r.definition.filters,
    isActive: r.isActive,
  };
}

function formToInput(f: FormState): CustomerSegmentInput {
  return {
    name: f.name,
    definition: { filters: f.filters },
    isActive: f.isActive,
  };
}

function formatRelative(iso: string | null) {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function describeFilter(f: SegmentFilter): string {
  const label = FIELD_LABELS[f.field];
  if (BOOLEAN_FIELDS.includes(f.field)) {
    return `${label} ${f.value ? 'yes' : 'no'}`;
  }
  return `${label} ${OP_LABELS[f.op]} ${f.value}`;
}

export default function SegmentsPage() {
  const { data, isLoading, isError, refetch } = useCustomerSegments();
  const create = useCreateCustomerSegment();
  const update = useUpdateCustomerSegment();
  const del = useDeleteCustomerSegment();
  const refresh = useRefreshCustomerSegment();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const segments = data?.segments ?? [];

  useEffect(() => {
    if (!modalOpen) {
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
  }, [modalOpen]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (s: CustomerSegmentRow) => {
    setForm(rowToForm(s));
    setEditingId(s.id);
    setModalOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = formToInput(form);
    if (editingId) {
      await update.mutateAsync({ id: editingId, input });
    } else {
      await create.mutateAsync(input);
    }
    setModalOpen(false);
  };

  const onDelete = async (s: CustomerSegmentRow) => {
    if (!confirm(`Delete segment "${s.name}"?`)) return;
    await del.mutateAsync(s.id);
  };

  const addFilter = () => {
    setForm((f) => ({
      ...f,
      filters: [...f.filters, { field: 'totalSpent', op: 'gte', value: 0 }],
    }));
  };

  const removeFilter = (i: number) => {
    setForm((f) => ({
      ...f,
      filters: f.filters.filter((_, idx) => idx !== i),
    }));
  };

  const updateFilter = (i: number, patch: Partial<SegmentFilter>) => {
    setForm((f) => {
      const next = [...f.filters];
      const merged = { ...next[i], ...patch };
      // If the field type changed, reset op + value to safe defaults.
      if (patch.field) {
        if (BOOLEAN_FIELDS.includes(patch.field as SegmentField)) {
          merged.op = 'eq';
          merged.value = true;
        } else if (NUMBER_FIELDS.includes(patch.field as SegmentField)) {
          if (typeof merged.value !== 'number') merged.value = 0;
          if (merged.op === 'eq') merged.op = 'gte';
        }
      }
      next[i] = merged as SegmentFilter;
      return { ...f, filters: next };
    });
  };

  const submitting = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Customer segments</h1>
          <p className="text-sm text-medium-gray mt-1">
            Saved cohort definitions — multiple filters AND&rsquo;d together. Member counts
            recompute on save, on a manual Refresh, and nightly via cron.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={14} />
          New segment
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-error">Failed to load segments.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-text-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        ) : segments.length === 0 ? (
          <div className="text-center py-12 text-medium-gray text-sm">
            No segments yet. Click &ldquo;New segment&rdquo; to define your first cohort.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-charcoal text-left">
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Filters</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide text-right">
                    Members
                  </th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">
                    Refreshed
                  </th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-surface-tint/30">
                    <td className="px-2 py-3 font-medium">{s.name}</td>
                    <td className="px-2 py-3 text-xs text-text-muted">
                      <div className="flex flex-wrap gap-1">
                        {s.definition.filters.map((f, i) => (
                          <span
                            key={i}
                            className="inline-block bg-surface-tint border border-border px-1.5 py-0.5 rounded text-[11px]"
                          >
                            {describeFilter(f)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-medium">
                      {s.memberCount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-2 py-3 text-xs text-text-muted">
                      {formatRelative(s.lastEvaluatedAt)}
                    </td>
                    <td className="px-2 py-3">
                      {s.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Off</Badge>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => refresh.mutate(s.id)}
                          className="p-1.5 text-text-secondary hover:text-text-primary"
                          title="Refresh count"
                          disabled={refresh.isPending}
                        >
                          <RefreshCw
                            size={14}
                            className={refresh.isPending ? 'animate-spin' : ''}
                          />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-text-secondary hover:text-text-primary"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(s)}
                          className="p-1.5 text-text-secondary hover:text-error"
                          title="Delete"
                          disabled={del.isPending}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit segment' : 'New segment'}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. High-value lapsed customers"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            maxLength={120}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Filters (AND)</span>
              <button
                type="button"
                onClick={addFilter}
                className="text-xs text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
                disabled={form.filters.length >= 10}
              >
                <Plus size={12} /> Add filter
              </button>
            </div>
            {form.filters.map((filter, i) => {
              const isBool = BOOLEAN_FIELDS.includes(filter.field);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 border border-border bg-surface-tint/30 p-2"
                >
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(i, { field: e.target.value as SegmentField })}
                    className="text-sm bg-surface border border-border px-2 py-1 flex-1"
                  >
                    {SEGMENT_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filter.op}
                    onChange={(e) => updateFilter(i, { op: e.target.value as SegmentOp })}
                    disabled={isBool}
                    className="text-sm bg-surface border border-border px-2 py-1 w-16"
                  >
                    {(isBool ? ['eq'] : (SEGMENT_OPS as readonly SegmentOp[])).map((op) => (
                      <option key={op} value={op}>
                        {OP_LABELS[op as SegmentOp]}
                      </option>
                    ))}
                  </select>
                  {isBool ? (
                    <select
                      value={String(filter.value)}
                      onChange={(e) => updateFilter(i, { value: e.target.value === 'true' })}
                      className="text-sm bg-surface border border-border px-2 py-1 w-24"
                    >
                      <option value="true">yes</option>
                      <option value="false">no</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      value={typeof filter.value === 'number' ? filter.value : 0}
                      onChange={(e) => updateFilter(i, { value: Number(e.target.value) || 0 })}
                      className="text-sm bg-surface border border-border px-2 py-1 w-28 text-right"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFilter(i)}
                    className="p-1 text-text-secondary hover:text-error"
                    disabled={form.filters.length === 1}
                    title={form.filters.length === 1 ? 'At least one filter required' : 'Remove'}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active (refreshed by nightly cron)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingId ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
