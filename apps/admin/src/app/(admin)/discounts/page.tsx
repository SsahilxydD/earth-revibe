'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Badge, Card, Select } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { CalendarPicker } from '@/components/ui/calendar';
import {
  useDiscounts,
  useCreateDiscount,
  useUpdateDiscount,
  useDeleteDiscount,
  useToggleDiscount,
} from '@/hooks/use-discounts';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'FLAT', label: 'Fixed' },
];

const activeOptions = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const discountTypeOptions = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FLAT', label: 'Fixed Amount' },
];

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTimeLocal(date: string) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface DiscountFormData {
  code: string;
  description: string;
  type: string;
  value: string;
  minOrderValue: string;
  maxDiscountAmount: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  expiresAt: string;
}

const emptyForm: DiscountFormData = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: '',
  minOrderValue: '',
  maxDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '1',
  startsAt: '',
  expiresAt: '',
};

export default function DiscountsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DiscountFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDiscounts({
    page,
    limit: 20,
    search: search || undefined,
    isActive: activeFilter || undefined,
    type: typeFilter || undefined,
  });

  const createMutation = useCreateDiscount();
  const updateMutation = useUpdateDiscount();
  const deleteMutation = useDeleteDiscount();
  const toggleMutation = useToggleDiscount();

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (discount: any) => {
    setEditingId(discount.id);
    setForm({
      code: discount.code,
      description: discount.description || '',
      type: discount.type,
      value: String(discount.value),
      minOrderValue: discount.minOrderValue != null ? String(discount.minOrderValue) : '',
      maxDiscountAmount:
        discount.maxDiscountAmount != null ? String(discount.maxDiscountAmount) : '',
      usageLimit: discount.usageLimit != null ? String(discount.usageLimit) : '',
      perUserLimit: discount.perUserLimit != null ? String(discount.perUserLimit) : '1',
      startsAt: discount.startsAt ? formatDateTimeLocal(discount.startsAt) : '',
      expiresAt: formatDateTimeLocal(discount.expiresAt),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim()) {
      toast.error('Discount code is required');
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      toast.error('Value must be greater than 0');
      return;
    }
    if (!form.expiresAt) {
      toast.error('Expiry date is required');
      return;
    }
    if (new Date(form.expiresAt) <= new Date()) {
      toast.error('Expiry date must be in the future');
      return;
    }

    const payload = {
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      value: Number(form.value),
      minOrderValue: form.minOrderValue !== '' ? Number(form.minOrderValue) : undefined,
      maxDiscountAmount: form.maxDiscountAmount !== '' ? Number(form.maxDiscountAmount) : undefined,
      usageLimit: form.usageLimit !== '' ? Number(form.usageLimit) : undefined,
      perUserLimit: form.perUserLimit !== '' ? Number(form.perUserLimit) : 1,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      expiresAt: form.expiresAt,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      closeModal();
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleMutation.mutateAsync(id);
    } catch {
      // Error handled by mutation onError
    }
  };

  const isNowActive = (discount: any) => {
    if (!discount.isActive) return false;
    return new Date(discount.expiresAt) >= new Date();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Discount Codes</h1>
          <p className="text-sm text-medium-gray mt-1">
            Create and manage promotional discount codes
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={16} /> Create Discount
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
            />
            <input
              type="text"
              placeholder="Search by discount code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={activeOptions}
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
          />
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
          />
        </div>
      </Card>

      {/* Discounts table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load discounts</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !data?.discounts?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No discount codes found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Code</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Type</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Value</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Min Order</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Usage</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Valid Period
                    </th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.discounts.map((discount: any) => (
                    <tr
                      key={discount.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3">
                        <span className="font-mono font-semibold text-charcoal">
                          {discount.code}
                        </span>
                        {discount.description && (
                          <p className="text-xs text-medium-gray mt-0.5">{discount.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={discount.type === 'PERCENTAGE' ? 'info' : 'default'}>
                          {discount.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-charcoal">
                        {discount.type === 'PERCENTAGE'
                          ? `${Number(discount.value)}%`
                          : formatPrice(discount.value)}
                        {discount.maxDiscountAmount && discount.type === 'PERCENTAGE' && (
                          <p className="text-xs text-medium-gray">
                            max {formatPrice(discount.maxDiscountAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-dark-gray">
                        {discount.minOrderValue ? formatPrice(discount.minOrderValue) : '-'}
                      </td>
                      <td className="px-6 py-3 text-dark-gray">
                        {discount.usageCount}
                        {discount.usageLimit ? `/${discount.usageLimit}` : ''}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            isNowActive(discount)
                              ? 'success'
                              : discount.isActive
                                ? 'warning'
                                : 'error'
                          }
                        >
                          {!discount.isActive
                            ? 'Inactive'
                            : isNowActive(discount)
                              ? 'Active'
                              : 'Expired'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-dark-gray text-xs">
                        <div>Expires {formatDate(discount.expiresAt)}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-0.5">
                          <button
                            onClick={() => handleToggle(discount.id)}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title={discount.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {discount.isActive ? (
                              <ToggleRight size={16} className="text-forest-green" />
                            ) : (
                              <ToggleLeft size={16} className="text-medium-gray" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditModal(discount)}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} className="text-dark-gray" />
                          </button>
                          <button
                            onClick={() => setDeleteId(discount.id)}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-error" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} discounts)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Discount Code' : 'Create Discount Code'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SAVE20"
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 appearance-none"
              >
                {discountTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-charcoal">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description (optional)"
              className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">
                Value * {form.type === 'PERCENTAGE' ? '(%)' : '(INR)'}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'}
                min="0"
                step={form.type === 'PERCENTAGE' ? '1' : '0.01'}
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Min Order Value</label>
              <input
                type="number"
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                placeholder="e.g. 1000"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Max Discount Amount</label>
              <input
                type="number"
                value={form.maxDiscountAmount}
                onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                placeholder="e.g. 500"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Total Usage Limit</label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="Unlimited"
                min="1"
                step="1"
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Per User Limit</label>
              <input
                type="number"
                value={form.perUserLimit}
                onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
                placeholder="1"
                min="1"
                step="1"
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Starts At</label>
              <CalendarPicker
                value={form.startsAt}
                onChange={(val) => setForm({ ...form, startsAt: val })}
              />
              <p className="text-xs text-medium-gray">Leave empty for immediate start</p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal">Expires At *</label>
              <CalendarPicker
                value={form.expiresAt}
                onChange={(val) => setForm({ ...form, expiresAt: val })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Update Discount' : 'Create Discount'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Discount Code"
        size="sm"
      >
        <p className="text-sm text-dark-gray mb-6">
          Are you sure you want to delete this discount code? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteMutation.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
