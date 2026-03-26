'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, Badge, Skeleton } from '@/components/ui';
import { ShoppingCart } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'default' | 'error'> = {
  DELIVERED: 'success',
  SHIPPED: 'info',
  PROCESSING: 'warning',
  PENDING: 'default',
  CANCELLED: 'error',
};

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RecentOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => api.get('/admin/analytics/recent-orders'),
  });

  const orders = data?.orders || [];

  return (
    <Card padding={false}>
      <div className="px-5 py-4 border-b border-light-gray flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">Recent orders</h3>
        <Link
          href="/orders"
          className="text-xs font-medium text-deep-earth hover:text-deep-earth/80 transition-colors"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center">
          <ShoppingCart size={32} className="mx-auto text-light-gray mb-2" />
          <p className="text-sm text-medium-gray">No orders yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-gray">
                <th className="text-left px-5 py-2.5 font-medium text-medium-gray text-xs">
                  Order
                </th>
                <th className="text-left px-5 py-2.5 font-medium text-medium-gray text-xs">
                  Customer
                </th>
                <th className="text-right px-5 py-2.5 font-medium text-medium-gray text-xs">
                  Total
                </th>
                <th className="text-left px-5 py-2.5 font-medium text-medium-gray text-xs">
                  Status
                </th>
                <th className="text-right px-5 py-2.5 font-medium text-medium-gray text-xs">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr
                  key={order.id}
                  className="border-b border-light-gray last:border-0 hover:bg-off-white/50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-deep-earth hover:underline"
                    >
                      #{order.id}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-dark-gray">{order.customer}</td>
                  <td className="px-5 py-3 text-charcoal font-medium text-right">
                    {formatINR(Number(order.total))}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant[order.status] || 'default'}>{order.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-medium-gray text-right text-xs">
                    {timeAgo(order.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
