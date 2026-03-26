'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, ShoppingBag, Users, Headset } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, Badge, Skeleton } from '@/components/ui';
import { formatPrice } from '@earth-revibe/shared';
import { StatCard } from '@/components/dashboard/stat-card';

const AnalyticsCharts = dynamic(() => import('@/components/analytics/analytics-charts'), {
  ssr: false,
});

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => api.get(`/admin/analytics/detailed?period=${period}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">Analytics</h1>
        <div className="flex gap-1 bg-off-white rounded-lg p-1">
          {[
            { label: '7 Days', value: '7d' },
            { label: '30 Days', value: '30d' },
            { label: '90 Days', value: '90d' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-white text-charcoal shadow-sm'
                  : 'text-medium-gray hover:text-charcoal'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load analytics</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-deep-earth hover:underline"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Avg Order Value"
            value={formatPrice(data?.avgOrderValue || 0)}
            change={`${data?.totalOrders || 0} total orders`}
            changeType="neutral"
            icon={TrendingUp}
          />
          <StatCard
            title="Total Orders"
            value={String(data?.totalOrders || 0)}
            change={`in last ${period === '7d' ? '7 days' : period === '90d' ? '90 days' : '30 days'}`}
            changeType="neutral"
            icon={ShoppingBag}
          />
          <StatCard
            title="New Customers"
            value={String(data?.customerGrowth?.reduce((s: number, c: any) => s + c.count, 0) || 0)}
            change={`in last ${period === '7d' ? '7 days' : period === '90d' ? '90 days' : '30 days'}`}
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Support Tickets"
            value={String(data?.totalTickets || 0)}
            change={`${data?.openTickets || 0} open`}
            changeType={data?.openTickets > 5 ? 'negative' : 'neutral'}
            icon={Headset}
          />
        </div>
      )}

      {!isLoading && data && <AnalyticsCharts data={data} />}

      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Top Products</h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.topProducts?.length ? (
          <p className="text-medium-gray text-center py-4">No product data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-gray">
                <th className="text-left py-2 font-medium text-medium-gray">Product</th>
                <th className="text-right py-2 font-medium text-medium-gray">Units Sold</th>
                <th className="text-right py-2 font-medium text-medium-gray">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product: any, i: number) => (
                <tr key={i} className="border-b border-light-gray last:border-0">
                  <td className="py-2 text-charcoal">{product.name}</td>
                  <td className="py-2 text-right text-medium-gray">{product.quantity}</td>
                  <td className="py-2 text-right text-charcoal font-medium">
                    {formatPrice(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Order Status Breakdown</h3>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !data?.ordersByStatus?.length ? (
          <p className="text-medium-gray text-center py-4">No order data yet</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {data.ordersByStatus.map((s: any) => (
              <div key={s.status} className="flex items-center gap-2">
                <Badge
                  variant={
                    s.status === 'DELIVERED'
                      ? 'success'
                      : s.status === 'CANCELLED'
                        ? 'error'
                        : s.status === 'PROCESSING' || s.status === 'SHIPPED'
                          ? 'warning'
                          : 'default'
                  }
                >
                  {s.status}
                </Badge>
                <span className="text-sm font-medium text-charcoal">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
