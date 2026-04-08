'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  items: { id: string }[];
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  PLACED: '#EAB308',
  CONFIRMED: '#3B82F6',
  PROCESSING: '#3B82F6',
  SHIPPED: '#8B5CF6',
  OUT_FOR_DELIVERY: '#8B5CF6',
  DELIVERED: '#22C55E',
  CANCELLED: '#999',
  RETURNED: '#999',
  REFUNDED: '#999',
};

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
        setTimeout(() => qc.invalidateQueries({ queryKey: ['orders'] }), 1000);
      }
    },
  });

  const orders = data?.orders;

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div
        style={{
          padding: '80px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>No orders yet</p>
        <Link
          href="/categories/new-arrivals"
          style={{
            marginTop: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 46,
            padding: '0 32px',
            border: '1px solid #000',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 2,
            color: '#000',
            textDecoration: 'none',
          }}
        >
          START SHOPPING
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 28px 28px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
            ORDER HISTORY
          </span>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: '#000',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              opacity: syncMutation.isPending ? 0.5 : 1,
            }}
          >
            {syncMutation.isPending ? 'Syncing…' : 'Sync'}
          </button>
        </div>
        <span style={{ fontSize: 11, fontWeight: 300, color: '#999' }}>
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* Order list — no gap between items, 1px dividers */}
      <div style={{ marginTop: 0 }}>
        {orders.map((order, i) => (
          <div key={order.id}>
            <Link
              href={`/account/orders/${order.orderNumber}`}
              style={{ display: 'block', padding: '20px 0', textDecoration: 'none' }}
            >
              {/* Top row: order number + status */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                    fontSize: 13,
                    fontWeight: 400,
                    color: '#000',
                    letterSpacing: 0.5,
                  }}
                >
                  #{order.orderNumber}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: STATUS_COLOR[order.status] || '#999',
                    letterSpacing: 0.5,
                  }}
                >
                  {order.status
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                    .replace(/\b(\w)(\w*)/g, (_, f, r) => f + r.toLowerCase())}
                </span>
              </div>
              {/* Bottom row: date + items | total */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>
                  {formatDate(order.createdAt)} · {order.items.length}{' '}
                  {order.items.length === 1 ? 'item' : 'items'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </Link>
            {i < orders.length - 1 && <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
