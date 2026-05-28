'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Trash2, AlertCircle, RotateCcw } from 'lucide-react';
import { SearchIcon, RefreshIcon, PlusIcon, OrderIcon } from '@shopify/polaris-icons';
import { Button, Badge, Card, Select, PageHeader } from '@earth-revibe/ui';
import { Modal } from '@earth-revibe/ui/modal';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { useOrders, useArchiveOrder, useRestoreOrder } from '@/hooks/use-orders';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from '@earth-revibe/ui';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft (offline)' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  DRAFT: 'default',
  PENDING: 'info',
  CONFIRMED: 'info',
  SHIPPING: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
};

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

const IN_FLIGHT_STATUSES = new Set(['CONFIRMED', 'SHIPPING']);

function syncIndicator(order: {
  awbCode?: string | null;
  status: string;
  lastShipmentSyncAt?: string | null;
}): { text: string; stale: boolean } | null {
  if (!order.awbCode) return null;
  if (!order.lastShipmentSyncAt) {
    return { text: 'never synced', stale: IN_FLIGHT_STATUSES.has(order.status) };
  }
  const ageMs = Date.now() - new Date(order.lastShipmentSyncAt).getTime();
  const ageMin = Math.floor(ageMs / 60_000);
  const stale = IN_FLIGHT_STATUSES.has(order.status) && ageMin > 15;
  if (ageMin < 1) return { text: 'synced just now', stale: false };
  if (ageMin < 60) return { text: `synced ${ageMin}m ago`, stale };
  const ageHr = Math.floor(ageMin / 60);
  return { text: `synced ${ageHr}h ago`, stale };
}

/**
 * Shared orders table for both the Active and Archived nav views.
 *  - view="active"   → non-archived orders; per-row Archive (soft-delete) action.
 *  - view="archived" → only archived (soft-deleted) orders; per-row Restore action.
 * The `view` param is sent to the API, which already filters on it
 * (adminOrderQuerySchema defaults to 'active').
 */
export function OrdersView({ view }: { view: 'active' | 'archived' }) {
  const isArchived = view === 'archived';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // The row the admin is acting on (archive on the active view, restore on the
  // archived view). archiveReason is only used by the archive flow.
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const qc = useQueryClient();
  const archiveOrder = useArchiveOrder();
  const restoreOrder = useRestoreOrder();

  const { data, isLoading, isError } = useOrders({
    page,
    limit: 20,
    status: status || undefined,
    search: search || undefined,
    view,
  });

  const handleConfirmArchive = async () => {
    if (!actionTarget) return;
    try {
      await archiveOrder.mutateAsync({
        orderNumber: actionTarget,
        reason: archiveReason.trim() || undefined,
      });
      toast.success(`Order ${actionTarget} archived`);
      setActionTarget(null);
      setArchiveReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive order');
    }
  };

  const handleConfirmRestore = async () => {
    if (!actionTarget) return;
    try {
      await restoreOrder.mutateAsync(actionTarget);
      toast.success(`Order ${actionTarget} restored`);
      setActionTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore order');
    }
  };

  const syncMutation = useMutation({
    mutationFn: () =>
      api.post<{ finalized: number; released: number; skipped: number; errors: number }>(
        '/admin/orders/sync'
      ),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success(
        result.finalized > 0
          ? `Synced ${result.finalized} order${result.finalized !== 1 ? 's' : ''}`
          : 'All orders are up to date'
      );
    },
    onError: () => toast.error('Sync failed — try again'),
  });

  return (
    <div className="space-y-3">
      <PageHeader
        icon={OrderIcon}
        title={isArchived ? 'Archived orders' : 'Orders'}
        actions={
          isArchived ? undefined : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => syncMutation.mutate()}
                isLoading={syncMutation.isPending}
              >
                <RefreshIcon className="w-3.5 h-3.5 fill-current" />
                Sync
              </Button>
              <Link href="/orders/new">
                <Button variant="primary" size="sm">
                  <PlusIcon className="w-3.5 h-3.5 fill-current" />
                  New offline order
                </Button>
              </Link>
            </>
          )
        }
      />

      <Card padding={false}>
        <div className="flex flex-col sm:flex-row gap-2 p-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 fill-[#8a8a8a] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by order #, email, or name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-white text-[13px] text-[#303030] placeholder:text-[#8a8a8a] outline-none transition-shadow shadow-[inset_0_0_0_1px_#ebebeb] focus:shadow-[inset_0_0_0_1px_#005bd3,0_0_0_2px_rgba(0,91,211,0.2)]"
            />
          </div>
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray bg-off-white/50">
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Payment</th>
                  <th className="text-right px-6 py-3 font-medium text-medium-gray">Total</th>
                  <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-light-gray last:border-0">
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-36" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-6 py-3 flex justify-end">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-6 w-6 ml-auto rounded-md" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load orders</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !data?.orders?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">
              {isArchived ? 'No archived orders' : 'No orders found'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Date</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Payment</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Total</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order: any) => (
                    <tr
                      key={order.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/orders/${order.orderNumber}`}
                          className="font-medium text-deep-earth hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <p className="text-charcoal">
                            {order.user
                              ? `${order.user.firstName} ${order.user.lastName}`
                              : order.guestName || order.guestEmail || 'Guest'}
                          </p>
                          <p className="text-xs text-medium-gray">
                            {order.user?.email ||
                              (order.guestPhone ? `+91 ${order.guestPhone}` : '')}
                            {order.status === 'DRAFT' && !order.user && (
                              <span className="ml-1 text-amber-600">· unverified</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Badge variant={statusVariant[order.status] || 'default'}>
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                          {(() => {
                            const ind = syncIndicator(order);
                            if (!ind) return null;
                            return (
                              <span
                                className={
                                  'text-[10px] leading-tight ' +
                                  (ind.stale ? 'text-red-600 font-medium' : 'text-medium-gray')
                                }
                                title={
                                  ind.stale
                                    ? 'No Shiprocket sync in over 15 minutes — status may be out of date'
                                    : 'Last refresh from Shiprocket'
                                }
                              >
                                {ind.stale ? '⚠ ' : ''}
                                {ind.text}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            order.payment?.status === 'CAPTURED'
                              ? 'success'
                              : order.payment?.status === 'FAILED'
                                ? 'error'
                                : 'warning'
                          }
                        >
                          {order.payment?.status || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-charcoal">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/orders/${order.orderNumber}`}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="View"
                          >
                            <Eye size={16} className="text-dark-gray" />
                          </Link>
                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => setActionTarget(order.orderNumber)}
                              className="p-1.5 rounded-md hover:bg-green-50 transition-colors"
                              title="Restore"
                            >
                              <RotateCcw size={16} className="text-green-700" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActionTarget(order.orderNumber)}
                              className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                              title="Archive (soft-delete)"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} orders)
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

      {/* Archive confirmation — active view only. Soft-delete: order disappears
          from this list + analytics but is retained and restorable. */}
      {!isArchived && (
        <Modal
          isOpen={actionTarget !== null}
          onClose={() => {
            setActionTarget(null);
            setArchiveReason('');
          }}
          title="Archive order"
          size="sm"
        >
          <div className="flex gap-3 mb-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-charcoal">
              Archive order <span className="font-mono">#{actionTarget}</span>? It will be hidden
              from this list, customer history, and ALL analytics aggregates. Payment and status
              history are retained — you can restore it from the Archived tab or the order detail
              page.
              <br />
              <span className="text-medium-gray text-xs mt-1 inline-block">
                Archiving is not a refund. If money was charged, initiate a refund first.
              </span>
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. test order, duplicate"
                className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setActionTarget(null);
                  setArchiveReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmArchive}
                disabled={archiveOrder.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {archiveOrder.isPending ? 'Archiving…' : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Restore confirmation — archived view only. */}
      {isArchived && (
        <Modal
          isOpen={actionTarget !== null}
          onClose={() => setActionTarget(null)}
          title="Restore order"
          size="sm"
        >
          <div className="flex gap-3 mb-4">
            <RotateCcw size={20} className="text-green-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-charcoal">
              Restore order <span className="font-mono">#{actionTarget}</span>? It will reappear in
              the active orders list, customer history, and analytics aggregates.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setActionTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRestore} disabled={restoreOrder.isPending}>
              {restoreOrder.isPending ? 'Restoring…' : 'Confirm Restore'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
