'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ChevronRight, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-800' },
  shipped: { bg: 'bg-purple-100', text: 'text-purple-800' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
  returned: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

function OrderStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      className={`inline-block rounded-[var(--badge-radius)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {status}
    </span>
  );
}

export default function OrdersPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get<{ orders: Order[]; total: number }>('/orders'),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post<{ synced: number }>('/orders/sync'),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (result.synced > 0) {
        // Brief delay so the invalidated query has time to refetch
        setTimeout(() => qc.invalidateQueries({ queryKey: ['orders'] }), 1000);
      }
    },
  });

  const orders = data?.orders;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div
        style={{ paddingTop: 80, paddingBottom: 80 }}
        className="flex flex-col items-center text-center"
      >
        <Package size={40} strokeWidth={1} className="text-[#c0c0c0]" />
        <h2 style={{ marginTop: 24 }} className="text-xs font-bold uppercase tracking-[0.2em]">
          No orders yet
        </h2>
        <p style={{ marginTop: 10, maxWidth: 240 }} className="text-xs leading-relaxed text-[#999]">
          Once you place an order, you&apos;ll be able to track it here.
        </p>
        <Link
          href="/categories/new-arrivals"
          style={{ marginTop: 28 }}
          className="inline-flex items-center justify-center border border-[var(--color-primary)] px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Order History</h2>
          <p className="mt-2 text-xs text-[var(--color-muted)]">Track and manage your orders.</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex shrink-0 items-center gap-1.5 border border-[var(--color-border)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
        >
          <RefreshCw size={12} className={syncMutation.isPending ? 'animate-spin' : ''} />
          {syncMutation.isPending ? 'Syncing…' : 'Sync Orders'}
        </button>
      </div>

      <hr
        style={{ marginTop: 28, marginBottom: 28, border: 'none', borderTop: '1px solid #e5e5e5' }}
      />

      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.orderNumber}`}
            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:bg-[var(--color-surface)] md:p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">#{order.orderNumber}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--color-muted)]">
                <span>{formatDate(order.createdAt)}</span>
                <span>
                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{formatPrice(order.total)}</span>
              <ChevronRight size={18} className="text-[var(--color-muted)]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
