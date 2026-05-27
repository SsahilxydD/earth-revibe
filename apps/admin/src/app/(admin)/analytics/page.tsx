'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, ShoppingBag, Users, Headset, Globe, Store } from 'lucide-react';
import { ChartLineIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, Badge, Skeleton, PageHeader } from '@earth-revibe/ui';
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
    <div className="space-y-3">
      <PageHeader
        icon={ChartLineIcon}
        title="Analytics"
        actions={
          <div className="flex gap-0.5 bg-[#f1f1f1] rounded-lg p-0.5">
            {[
              { label: '7 days', value: '7d' },
              { label: '30 days', value: '30d' },
              { label: '90 days', value: '90d' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 h-7 rounded-md text-[13px] font-medium ${
                  period === p.value
                    ? 'bg-white text-[#303030] shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_1px_rgba(0,0,0,0.04)]'
                    : 'text-[#616161] hover:text-[#1a1a1a]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />
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

      {/* Sales by channel — online (storefront) vs offline (manual / in-person) */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-charcoal">Sales by channel</h3>
          <span className="text-xs text-medium-gray">Excludes cancelled and archived orders</span>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !data?.salesBySource ? (
          <p className="text-sm text-medium-gray">No data yet</p>
        ) : (
          (() => {
            const online = data.salesBySource.online ?? { revenue: 0, orders: 0 };
            const offline = data.salesBySource.offline ?? { revenue: 0, orders: 0 };
            const totalRev = Number(online.revenue) + Number(offline.revenue);
            const onlinePct = totalRev > 0 ? (Number(online.revenue) / totalRev) * 100 : 0;
            const offlinePct = totalRev > 0 ? 100 - onlinePct : 0;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-light-gray">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Globe size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-medium-gray">Online (storefront)</p>
                      <p className="text-xl font-semibold text-charcoal">
                        {formatPrice(online.revenue)}
                      </p>
                      <p className="text-xs text-medium-gray mt-0.5">
                        {online.orders} order{online.orders !== 1 ? 's' : ''} &middot;{' '}
                        {onlinePct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-light-gray">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Store size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-medium-gray">Offline (manual)</p>
                      <p className="text-xl font-semibold text-charcoal">
                        {formatPrice(offline.revenue)}
                      </p>
                      <p className="text-xs text-medium-gray mt-0.5">
                        {offline.orders} order{offline.orders !== 1 ? 's' : ''} &middot;{' '}
                        {offlinePct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
                {/* Stacked split bar */}
                {totalRev > 0 && (
                  <div
                    className="h-2 w-full rounded-full overflow-hidden bg-light-gray flex"
                    aria-label="Online vs offline revenue split"
                  >
                    <div
                      className="bg-blue-500"
                      style={{ width: `${onlinePct}%` }}
                      title={`Online ${onlinePct.toFixed(0)}%`}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${offlinePct}%` }}
                      title={`Offline ${offlinePct.toFixed(0)}%`}
                    />
                  </div>
                )}
              </div>
            );
          })()
        )}
      </Card>

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
                        : s.status === 'SHIPPING'
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
