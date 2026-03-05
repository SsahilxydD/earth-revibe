"use client";

import dynamic from "next/dynamic";
import { IndianRupee, ShoppingCart, Users, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { Skeleton } from "@/components/ui";

const RevenueChart = dynamic(() => import("@/components/dashboard/revenue-chart"), { ssr: false });

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/admin/analytics/dashboard"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Dashboard</h1>
        <p className="text-sm text-medium-gray mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={formatINR(stats?.revenue?.value || 0)}
              change={stats?.revenue?.change || ""}
              changeType={stats?.revenue?.change?.startsWith("+") ? "positive" : "negative"}
              icon={IndianRupee}
            />
            <StatCard
              title="Orders"
              value={String(stats?.orders?.value || 0)}
              change={stats?.orders?.change || ""}
              changeType={stats?.orders?.change?.startsWith("+") ? "positive" : "negative"}
              icon={ShoppingCart}
            />
            <StatCard
              title="Customers"
              value={String(stats?.customers?.value || 0)}
              change={stats?.customers?.change || ""}
              changeType="positive"
              icon={Users}
            />
            <StatCard
              title="Products"
              value={String(stats?.products?.value || 0)}
              change={stats?.products?.change || ""}
              changeType={stats?.products?.change?.includes("low stock") ? "negative" : "neutral"}
              icon={Package}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart />
        <RecentOrders />
      </div>
    </div>
  );
}
