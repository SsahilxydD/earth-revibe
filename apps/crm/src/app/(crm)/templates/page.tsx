'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, Button, Badge, Input, Select } from '@earth-revibe/ui';
import { Modal } from '@earth-revibe/ui/modal';
import { Textarea } from '@earth-revibe/ui/textarea';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import {
  TEMPLATE_KEYS,
  type TemplateKey,
  type TemplateVariantInput,
  type TemplateVariantRow,
  type VariantCounts,
} from '@earth-revibe/shared';
import {
  useTemplateVariants,
  useCreateTemplateVariant,
  useUpdateTemplateVariant,
  useDeleteTemplateVariant,
} from '@/hooks/use-template-variants';
import { compareProportions, formatPValue } from '@/lib/stats';

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  ABANDONED_CART_RECOVERY: 'Abandoned cart recovery',
};

interface FormState {
  templateKey: TemplateKey;
  variantKey: string;
  templateName: string;
  bodyPreview: string;
  weight: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  templateKey: 'ABANDONED_CART_RECOVERY',
  variantKey: '',
  templateName: '',
  bodyPreview: '',
  weight: 1,
  isActive: true,
};

const ZERO_COUNTS: VariantCounts = {
  queued: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
};

function rate(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default function TemplatesPage() {
  const { data, isLoading, isError, refetch } = useTemplateVariants();
  const create = useCreateTemplateVariant();
  const update = useUpdateTemplateVariant();
  const del = useDeleteTemplateVariant();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const variants = data?.variants ?? [];

  const grouped = useMemo(() => {
    const map = new Map<TemplateKey, TemplateVariantRow[]>();
    for (const v of variants) {
      const list = map.get(v.templateKey) ?? [];
      list.push(v);
      map.set(v.templateKey, list);
    }
    return map;
  }, [variants]);

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

  const openEdit = (v: TemplateVariantRow) => {
    setForm({
      templateKey: v.templateKey,
      variantKey: v.variantKey,
      templateName: v.templateName,
      bodyPreview: v.bodyPreview ?? '',
      weight: v.weight,
      isActive: v.isActive,
    });
    setEditingId(v.id);
    setModalOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: TemplateVariantInput = {
      templateKey: form.templateKey,
      variantKey: form.variantKey,
      templateName: form.templateName,
      bodyPreview: form.bodyPreview.trim() || null,
      weight: form.weight,
      isActive: form.isActive,
    };
    if (editingId) {
      await update.mutateAsync({ id: editingId, input });
    } else {
      await create.mutateAsync(input);
    }
    setModalOpen(false);
  };

  const onDelete = async (v: TemplateVariantRow) => {
    if (!confirm(`Delete variant ${v.templateKey}/${v.variantKey}? Funnel counts go with it.`))
      return;
    await del.mutateAsync(v.id);
  };

  const submitting = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Template variants</h1>
          <p className="text-sm text-medium-gray mt-1">
            A/B test Meta-approved templates. The send helpers pick a variant per send by weighted
            random selection across active rows for the same template key.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={14} />
          New variant
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : isError ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-error">Failed to load variants.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-text-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : variants.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-medium-gray text-sm">
            No variants yet. Without active variants, send helpers fall back to their hardcoded
            default template.
          </div>
        </Card>
      ) : (
        TEMPLATE_KEYS.map((key) => {
          const list = grouped.get(key) ?? [];
          if (list.length === 0) return null;
          const totalWeight = list.filter((v) => v.isActive).reduce((sum, v) => sum + v.weight, 0);

          // Pick the highest-volume variant as the implicit control. Every
          // other variant is compared against it via two-proportion z-test.
          // Sample size below 30 leaves the comparison as "—" with a tooltip.
          const withCounts = list.map((v) => {
            const c = v.counts ?? ZERO_COUNTS;
            const sent = c.queued || c.sent;
            return { v, c, sent };
          });
          const control = withCounts.reduce<(typeof withCounts)[number] | null>(
            (best, cur) => (best === null || cur.sent > best.sent ? cur : best),
            null
          );

          return (
            <Card key={key}>
              <div className="flex items-baseline justify-between gap-2 mb-3">
                <h2 className="text-base font-semibold text-charcoal">{TEMPLATE_LABELS[key]}</h2>
                <span className="text-xs text-text-muted">
                  {list.filter((v) => v.isActive).length} active · weight {totalWeight} · control:{' '}
                  {control ? control.v.variantKey : '—'}
                </span>
              </div>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-charcoal text-left">
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide">
                        Variant
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide">
                        Template name
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        Weight
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        Sent
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        Delivered
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        Read
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        Failed
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        Read rate
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        vs control
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-2 py-2 font-medium text-xs uppercase tracking-wide text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withCounts.map(({ v, c, sent }) => {
                      const readRate = rate(c.read, sent);
                      const deliveryRate = rate(c.delivered, sent);
                      const isControl = control !== null && control.v.id === v.id;
                      const cmp =
                        control !== null && !isControl
                          ? compareProportions({
                              trialsA: control.sent,
                              successesA: control.c.read,
                              trialsB: sent,
                              successesB: c.read,
                            })
                          : null;
                      return (
                        <tr key={v.id} className="border-b border-border hover:bg-surface-tint/30">
                          <td className="px-2 py-2 font-medium">
                            {v.variantKey}
                            {isControl && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-text-muted">
                                control
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-text-muted">{v.templateName}</td>
                          <td className="px-2 py-2 text-right">{v.weight}</td>
                          <td className="px-2 py-2 text-right">{sent}</td>
                          <td
                            className="px-2 py-2 text-right"
                            title={`${deliveryRate} delivery rate`}
                          >
                            {c.delivered}
                          </td>
                          <td className="px-2 py-2 text-right">{c.read}</td>
                          <td className="px-2 py-2 text-right">{c.failed}</td>
                          <td className="px-2 py-2 text-right font-medium">{readRate}</td>
                          <td className="px-2 py-2 text-right">
                            {isControl ? (
                              <span className="text-[11px] text-text-muted">—</span>
                            ) : cmp === null || cmp.pValue === null ? (
                              <span
                                className="text-[11px] text-text-muted"
                                title="Need ≥30 sends per variant to test"
                              >
                                n&lt;30
                              </span>
                            ) : cmp.significant ? (
                              <span title={formatPValue(cmp.pValue)}>
                                <Badge variant={(cmp.lift ?? 0) >= 0 ? 'success' : 'error'}>
                                  {(cmp.lift ?? 0) >= 0 ? '+' : ''}
                                  {((cmp.lift ?? 0) * 100).toFixed(1)}pp ({formatPValue(cmp.pValue)}
                                  )
                                </Badge>
                              </span>
                            ) : (
                              <span
                                className="text-[11px] text-text-muted"
                                title={formatPValue(cmp.pValue)}
                              >
                                ns
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {v.isActive ? (
                              <Badge variant="success">Active</Badge>
                            ) : (
                              <Badge variant="default">Off</Badge>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => openEdit(v)}
                                className="p-1.5 text-text-secondary hover:text-text-primary"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => onDelete(v)}
                                className="p-1.5 text-text-secondary hover:text-error"
                                title="Delete"
                                disabled={del.isPending}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit variant' : 'New variant'}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            label="Template"
            value={form.templateKey}
            onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value as TemplateKey }))}
            options={TEMPLATE_KEYS.map((k) => ({ value: k, label: TEMPLATE_LABELS[k] }))}
          />
          <Input
            label="Variant key (e.g. v1, holiday-2026)"
            value={form.variantKey}
            onChange={(e) => setForm((f) => ({ ...f, variantKey: e.target.value }))}
            required
            maxLength={64}
            pattern="^[a-zA-Z0-9_-]+$"
          />
          <Input
            label="Meta template name (must be approved by Meta)"
            value={form.templateName}
            onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
            required
            maxLength={255}
          />
          <Textarea
            label="Body preview (for CRM only — not sent to Meta)"
            placeholder="Hi {firstName}, you left these items in your cart…"
            value={form.bodyPreview}
            onChange={(e) => setForm((f) => ({ ...f, bodyPreview: e.target.value }))}
            rows={3}
            maxLength={2000}
          />
          <Input
            label="Weight (relative — picker normalises across active rows)"
            type="number"
            min={0}
            max={1000}
            value={form.weight}
            onChange={(e) =>
              setForm((f) => ({ ...f, weight: Math.max(0, Number(e.target.value) || 0) }))
            }
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active (eligible for send-time selection)
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
