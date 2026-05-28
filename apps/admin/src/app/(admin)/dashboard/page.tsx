'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Skeleton } from '@earth-revibe/ui';
import { FilterBar } from '@/components/dashboard/filter-bar';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { MetricsStrip } from '@/components/dashboard/metrics-strip';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ActionCards } from '@/components/dashboard/action-cards';
import { SalesChart } from '@/components/dashboard/sales-chart';
import RevenueChart from '@/components/dashboard/revenue-chart';
import { OrdersByStatus } from '@/components/dashboard/orders-by-status';
import { TopProducts } from '@/components/dashboard/top-products';
import { RecentOrders } from '@/components/dashboard/recent-orders';

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['home-dashboard', period],
    queryFn: () => api.get(`/admin/analytics/home?period=${period}`),
  });

  const m = data?.metrics;
  const salesOverTime = data?.salesOverTime ?? [];
  const topProducts = data?.topProducts ?? [];
  const ordersByStatus = data?.ordersByStatus ?? [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, let's get started.";
    if (hour < 17) return "Good afternoon, let's get started.";
    return "Good evening, let's get started.";
  };

  const metrics = m
    ? [
        {
          label: 'Sessions',
          value: String(m.onlineSessions?.value || 0),
          change: m.onlineSessions?.change || 0,
        },
        {
          label: 'Total sales',
          value: formatINR(m.totalSales?.value || 0),
          change: m.totalSales?.change || 0,
        },
        {
          label: 'Orders',
          value: String(m.totalOrders?.value || 0),
          change: m.totalOrders?.change || 0,
        },
        {
          label: 'Conversion rate',
          value: `${(m.conversionRate?.value || 0).toFixed(1)}%`,
          change: m.conversionRate?.change || 0,
        },
        {
          label: 'Avg order value',
          value: formatINR(m.avgOrderValue?.value || 0),
          change: m.avgOrderValue?.change || 0,
        },
        {
          label: 'Returning rate',
          value: `${(m.returningCustomerRate?.value || 0).toFixed(1)}%`,
          change: m.returningCustomerRate?.change || 0,
        },
      ]
    : [];

  return (
    <div className="max-w-[1100px] space-y-5">
      {/* Date controls - dropdown + pill selector (both bound to the same period) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterBar period={period} onPeriodChange={setPeriod} />
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Metrics strip - compact horizontal card with sparklines */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-light-gray flex divide-x divide-light-gray overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 px-4 py-3 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <MetricsStrip metrics={metrics} />
      )}

      {/* Metric cards grid - expanded view of the same metrics */}
      {!isLoading && metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((mc) => (
            <MetricCard key={mc.label} title={mc.label} value={mc.value} change={mc.change} />
          ))}
        </div>
      )}

      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-xl font-semibold text-charcoal">{greeting()}</h1>
      </div>

      {/* Sales over time for the selected period */}
      <SalesChart data={salesOverTime} isLoading={isLoading} />

      {/* Revenue overview - trailing 6 months (self-fetches) */}
      <RevenueChart />

      {/* Orders breakdown + best sellers (both fed by the same /home payload) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OrdersByStatus data={ordersByStatus} />
        <TopProducts products={topProducts} />
      </div>

      {/* Latest orders - self-fetches /admin/analytics/recent-orders */}
      <RecentOrders />

      {/* Action cards feed */}
      <ActionCards />
    </div>
  );
}
