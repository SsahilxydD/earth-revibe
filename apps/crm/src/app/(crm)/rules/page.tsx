'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, Button, Badge, Input, Select } from '@earth-revibe/ui';
import { Modal } from '@earth-revibe/ui/modal';
import { Textarea } from '@earth-revibe/ui/textarea';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import type {
  EngagementRuleInput,
  EngagementRuleRow,
  EngagementRuleActionType,
  EngagementRuleTrigger,
} from '@earth-revibe/shared';
import {
  useEngagementRules,
  useCreateEngagementRule,
  useUpdateEngagementRule,
  useDeleteEngagementRule,
} from '@/hooks/use-engagement-rules';

const TRIGGER_OPTIONS: { value: EngagementRuleTrigger; label: string }[] = [
  {
    value: 'CART_ABANDONED_READ_NO_PURCHASE',
    label: 'Cart abandoned · WhatsApp read · no purchase',
  },
];

const ACTION_TYPE_OPTIONS: { value: EngagementRuleActionType; label: string }[] = [
  { value: 'FLAG_FOR_MANUAL_OUTREACH', label: 'Flag for manual outreach' },
  { value: 'SEND_EMAIL', label: 'Send email (Resend)' },
];

interface FormState {
  name: string;
  trigger: EngagementRuleTrigger;
  delayHours: number;
  actionType: EngagementRuleActionType;
  reason: string;
  emailSubject: string;
  emailBody: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  trigger: 'CART_ABANDONED_READ_NO_PURCHASE',
  delayHours: 24,
  actionType: 'FLAG_FOR_MANUAL_OUTREACH',
  reason: '',
  emailSubject: '',
  emailBody: '',
  isActive: false,
};

function rowToForm(r: EngagementRuleRow): FormState {
  const base: FormState = {
    name: r.name,
    trigger: r.trigger,
    delayHours: r.delayHours,
    actionType: r.actionType,
    reason: '',
    emailSubject: '',
    emailBody: '',
    isActive: r.isActive,
  };
  if (r.actionType === 'FLAG_FOR_MANUAL_OUTREACH') {
    const p = r.actionPayload as { reason?: string };
    base.reason = p.reason ?? '';
  } else {
    const p = r.actionPayload as { subject?: string; body?: string };
    base.emailSubject = p.subject ?? '';
    base.emailBody = p.body ?? '';
  }
  return base;
}

function formToInput(f: FormState): EngagementRuleInput {
  return {
    name: f.name,
    trigger: f.trigger,
    delayHours: f.delayHours,
    actionType: f.actionType,
    actionPayload:
      f.actionType === 'FLAG_FOR_MANUAL_OUTREACH'
        ? { reason: f.reason }
        : { subject: f.emailSubject, body: f.emailBody },
    isActive: f.isActive,
  };
}

export default function EngagementRulesPage() {
  const { data, isLoading, isError, refetch } = useEngagementRules();
  const create = useCreateEngagementRule();
  const update = useUpdateEngagementRule();
  const del = useDeleteEngagementRule();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const rules = data?.rules ?? [];

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

  const openEdit = (r: EngagementRuleRow) => {
    setForm(rowToForm(r));
    setEditingId(r.id);
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

  const onToggleActive = async (r: EngagementRuleRow) => {
    await update.mutateAsync({
      id: r.id,
      input: { ...formToInput(rowToForm(r)), isActive: !r.isActive },
    });
  };

  const onDelete = async (r: EngagementRuleRow) => {
    if (!confirm(`Delete rule "${r.name}"? Fire history is removed too.`)) return;
    await del.mutateAsync(r.id);
  };

  const submitting = create.isPending || update.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Engagement rules</h1>
          <p className="text-sm text-medium-gray mt-1">
            Auto-escalate when a recovery message is read but doesn&rsquo;t convert. Cron evaluates
            active rules every 30 minutes.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={14} />
          New rule
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
            <p className="text-error">Failed to load rules.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-text-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-medium-gray text-sm">
            No rules yet. Click &ldquo;New rule&rdquo; to author your first one.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-charcoal text-left">
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Trigger</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Delay</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Action</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Fires</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-surface-tint/30">
                    <td className="px-2 py-3 font-medium">{r.name}</td>
                    <td className="px-2 py-3 text-xs text-text-muted">
                      {TRIGGER_OPTIONS.find((t) => t.value === r.trigger)?.label ?? r.trigger}
                    </td>
                    <td className="px-2 py-3">{r.delayHours}h</td>
                    <td className="px-2 py-3 text-xs">
                      {ACTION_TYPE_OPTIONS.find((a) => a.value === r.actionType)?.label ??
                        r.actionType}
                    </td>
                    <td className="px-2 py-3">{r.fireCount}</td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => onToggleActive(r)}
                        disabled={update.isPending}
                        className="cursor-pointer disabled:opacity-50"
                        title={r.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {r.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-text-secondary hover:text-text-primary"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(r)}
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
        title={editingId ? 'Edit rule' : 'New rule'}
        size="lg"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. 24h re-engagement after read"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            maxLength={120}
          />
          <Select
            label="Trigger"
            value={form.trigger}
            onChange={(e) =>
              setForm((f) => ({ ...f, trigger: e.target.value as EngagementRuleTrigger }))
            }
            options={TRIGGER_OPTIONS}
          />
          <Input
            label="Delay (hours)"
            type="number"
            min={1}
            max={720}
            value={form.delayHours}
            onChange={(e) =>
              setForm((f) => ({ ...f, delayHours: Math.max(1, Number(e.target.value) || 1) }))
            }
            required
          />
          <Select
            label="Action"
            value={form.actionType}
            onChange={(e) =>
              setForm((f) => ({ ...f, actionType: e.target.value as EngagementRuleActionType }))
            }
            options={ACTION_TYPE_OPTIONS}
          />

          {form.actionType === 'FLAG_FOR_MANUAL_OUTREACH' ? (
            <Textarea
              label="Reason (shown on the fire row in CRM)"
              placeholder="e.g. Read recovery 24h ago, no purchase — call or DM"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              rows={3}
              maxLength={500}
              required
            />
          ) : (
            <>
              <Input
                label="Email subject"
                placeholder="e.g. Still thinking it over?"
                value={form.emailSubject}
                onChange={(e) => setForm((f) => ({ ...f, emailSubject: e.target.value }))}
                maxLength={200}
                required
              />
              <Textarea
                label="Email body (use {firstName} for personalisation)"
                placeholder="Hi {firstName}, just checking in…"
                value={form.emailBody}
                onChange={(e) => setForm((f) => ({ ...f, emailBody: e.target.value }))}
                rows={5}
                maxLength={5000}
                required
              />
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Activate immediately
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
