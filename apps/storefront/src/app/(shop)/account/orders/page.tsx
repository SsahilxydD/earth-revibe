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

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#22C55E',
  SHIPPED: '#8B5CF6',
  CANCELLED: '#999',
  PLACED: '#EAB308',
  CONFIRMED: '#3B82F6',
  PROCESSING: '#3B82F6',
  OUT_FOR_DELIVERY: '#3B82F6',
  RETURNED: '#999',
  REFUNDED: '#999',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#3B82F6';
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
          paddingTop: 80,
          paddingBottom: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 12,
            fontWeight: 300,
            color: '#999',
          }}
        >
          No orders yet
        </p>
        <Link
          href="/categories/new-arrivals"
          style={{
            marginTop: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #000',
            backgroundColor: 'transparent',
            padding: '12px 32px',
            fontFamily: 'var(--font-inter)',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: '2px',
            color: '#000',
            textDecoration: 'none',
            textTransform: 'uppercase',
          }}
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              fontWeight: 400,
              color: '#999',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            Order History
          </span>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              fontWeight: 400,
              color: '#000',
              opacity: syncMutation.isPending ? 0.5 : 1,
            }}
          >
            {syncMutation.isPending ? 'Syncing...' : 'Sync'}
          </button>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 11,
            fontWeight: 300,
            color: '#999',
          }}
        >
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      {/* Order list */}
      <div style={{ marginTop: 20 }}>
        {orders.map((order, index) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.orderNumber}`}
            style={{
              display: 'block',
              textDecoration: 'none',
              padding: '20px 0',
              borderBottom: index < orders.length - 1 ? '1px solid #F0F0F0' : 'none',
              borderTop: index === 0 ? '1px solid #F0F0F0' : 'none',
            }}
          >
            {/* Top row: order number + status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 13,
                  fontWeight: 400,
                  color: '#000',
                  letterSpacing: '0.5px',
                }}
              >
                #{order.orderNumber}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 11,
                  fontWeight: 400,
                  color: getStatusColor(order.status),
                  letterSpacing: '0.5px',
                  textTransform: 'capitalize',
                }}
              >
                {formatStatusLabel(order.status)}
              </span>
            </div>

            {/* Bottom row: date + items, price */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 12,
                  fontWeight: 300,
                  color: '#999',
                }}
              >
                {formatDate(order.createdAt)} &middot; {order.items.length}{' '}
                {order.items.length === 1 ? 'item' : 'items'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  fontWeight: 400,
                  color: '#000',
                }}
              >
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
