"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TopProducts } from "@/components/dashboard/top-products";
import { OrdersByStatus } from "@/components/dashboard/orders-by-status";
import { RecentOrders } from "@/components/dashboard/recent-orders";

const SalesChart = dynamic(
  () => import("@/components/dashboard/sales-chart").then((m) => ({ default: m.SalesChart })),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full rounded-xl" /> }
);

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export default function DashboardPage() {
  const [period, setPeriod] = useState("today");

  const { data, isLoading } = useQuery({
    queryKey: ["home-dashboard", period],
    queryFn: () => api.get(`/admin/analytics/home?period=${period}`),
  });

  const metrics = data?.metrics;
  const topProducts = data?.topProducts || [];
  const salesOverTime = data?.salesOverTime || [];
  const ordersByStatus = data?.ordersByStatus || [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">{greeting()}</h1>
          <p className="text-sm text-medium-gray mt-0.5">{dateStr}</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Metric cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <MetricCard
            title="Total sales"
            value={formatINR(metrics?.totalSales?.value || 0)}
            change={metrics?.totalSales?.change || 0}
          />
          <MetricCard
            title="Orders"
            value={String(metrics?.totalOrders?.value || 0)}
            change={metrics?.totalOrders?.change || 0}
          />
          <MetricCard
            title="Avg order value"
            value={formatINR(metrics?.avgOrderValue?.value || 0)}
            change={metrics?.avgOrderValue?.change || 0}
          />
          <MetricCard
            title="Returning rate"
            value={`${(metrics?.returningCustomerRate?.value || 0).toFixed(1)}%`}
            change={metrics?.returningCustomerRate?.change || 0}
          />
          <MetricCard
            title="Conversion rate"
            value={`${(metrics?.conversionRate?.value || 0).toFixed(1)}%`}
            change={metrics?.conversionRate?.change || 0}
          />
          <MetricCard
            title="Sessions"
            value={formatNumber(metrics?.onlineSessions?.value || 0)}
            change={metrics?.onlineSessions?.change || 0}
          />
        </div>
      )}

      {/* Sales chart - only show when not "today" since today has no time-series */}
      {period !== "today" && (
        <SalesChart data={salesOverTime} isLoading={isLoading} />
      )}

      {/* Content grid: top products + orders by status */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopProducts products={topProducts} />
        <OrdersByStatus data={ordersByStatus} />
      </div>

      {/* Recent orders */}
      <RecentOrders />
    </div>
  );
}
