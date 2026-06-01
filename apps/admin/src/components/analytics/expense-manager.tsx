'use client';

import { useState } from 'react';
import { Card, Button, Input, Select } from '@earth-revibe/ui';
import { Trash2, Pencil, X } from 'lucide-react';
import { formatPrice, ExpenseCategory } from '@earth-revibe/shared';
import { isoToLocalDate, todayLocalDate, localDateToISO } from '@/lib/order-date';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks/use-expenses';

function categoryLabel(c: string) {
  return (c.charAt(0) + c.slice(1).toLowerCase()).replace('_', ' ');
}

const CATEGORY_OPTIONS = Object.values(ExpenseCategory).map((c) => ({
  value: c,
  label: categoryLabel(c),
}));

/**
 * CRUD for operating expenses (light bill, logistics, …). Scoped to the
 * analytics date range so the list mirrors what's feeding Net Profit. Editing
 * pre-fills the single top form (editingId switches create→update).
 */
export function ExpenseManager({ startISO, endISO }: { startISO?: string; endISO?: string }) {
  const { data, isLoading } = useExpenses({ startDate: startISO, endDate: endISO, limit: 100 });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<string>(ExpenseCategory.UTILITIES);
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(todayLocalDate());

  const expenses: any[] = data?.expenses ?? [];
  const totalAmount = Number(data?.totalAmount ?? 0);
  const busy = createExpense.isPending || updateExpense.isPending;

  const reset = () => {
    setEditingId(null);
    setLabel('');
    setCategory(ExpenseCategory.UTILITIES);
    setAmount('');
    setDay(todayLocalDate());
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!label.trim() || !amt || amt <= 0) return;
    const payload = {
      label: label.trim(),
      category,
      amount: amt,
      incurredAt: localDateToISO(day),
    };
    try {
      if (editingId) await updateExpense.mutateAsync({ id: editingId, data: payload });
      else await createExpense.mutateAsync(payload);
      reset();
    } catch {
      /* toast handled in the hook */
    }
  };

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setLabel(e.label);
    setCategory(e.category);
    setAmount(String(e.amount));
    setDay(isoToLocalDate(e.incurredAt));
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-charcoal">Operating expenses</h3>
          <p className="text-xs text-medium-gray">
            Light bill, logistics, rent… subtracted from gross profit. Showing the selected range.
          </p>
        </div>
        <span className="text-sm font-semibold text-charcoal">{formatPrice(totalAmount)}</span>
      </div>

      {/* Add / edit form */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end mb-4">
        <div className="sm:col-span-4">
          <Input
            label="Label"
            placeholder="Electricity bill — June"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-sm font-medium text-charcoal mb-1">Category</label>
          <Select
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            placeholder="2500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Date"
            type="date"
            max={todayLocalDate()}
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </div>
        <div className="sm:col-span-1 flex gap-1">
          <Button onClick={handleSubmit} disabled={busy} className="w-full">
            {editingId ? 'Save' : 'Add'}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={reset} aria-label="Cancel edit">
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-medium-gray py-2">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-medium-gray py-2">No expenses in this range yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light-gray text-medium-gray">
              <th className="text-left py-2 font-medium">Label</th>
              <th className="text-left py-2 font-medium">Category</th>
              <th className="text-left py-2 font-medium">Date</th>
              <th className="text-right py-2 font-medium">Amount</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-light-gray last:border-0">
                <td className="py-2 text-charcoal">{e.label}</td>
                <td className="py-2 text-medium-gray">{categoryLabel(e.category)}</td>
                <td className="py-2 text-medium-gray">
                  {new Date(e.incurredAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="py-2 text-right text-charcoal font-medium">
                  {formatPrice(e.amount)}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    className="p-1 text-medium-gray hover:text-charcoal"
                    aria-label="Edit expense"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteExpense.mutate(e.id)}
                    className="p-1 text-medium-gray hover:text-red-600"
                    aria-label="Delete expense"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
