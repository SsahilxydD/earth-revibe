# Phase 10: Analytics & SEO Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real analytics API (replacing dashboard mock data) with admin analytics page, and add SEO metadata to storefront dynamic pages (products, blog posts, categories).

**Architecture:** Analytics service aggregates existing order/user/product data via Prisma queries (no new models needed). Dashboard and analytics page fetch real data. Storefront SEO uses server component wrappers with `generateMetadata` for dynamic pages, keeping client interactivity in child components.

**Tech Stack:** Express 5 + Prisma (API), Next.js 16 + React 19 + Recharts + TanStack Query (Admin & Storefront)

---

### Task 1: API — Analytics Service & Routes

**Files:**
- Create: `apps/api/src/services/analytics.service.ts`
- Create: `apps/api/src/controllers/analytics.controller.ts`
- Create: `apps/api/src/routes/analytics.routes.ts`
- Modify: `apps/api/src/app.ts` (mount router)

**Context:** Derive all metrics from existing tables: Order (totalAmount, status, createdAt), User (createdAt, role), Product (status), OrderItem (quantity, price), SupportTicket (status). No new DB models. Admin-only routes. Use Prisma aggregation queries. Response pattern: `res.json({ success: true, ...result })`.

**Step 1: Create analytics.service.ts**

```typescript
import { prisma } from "@earth-revibe/db";

export const analyticsService = {
  // Dashboard KPI stats
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [
      totalRevenue,
      lastMonthRevenue,
      ordersThisMonth,
      ordersLastMonth,
      totalCustomers,
      newCustomersThisWeek,
      totalProducts,
      lowStockProducts,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { notIn: ["CANCELLED"] }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { status: { notIn: ["CANCELLED"] }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.order.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: startOfWeek } },
      }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.productVariant.count({ where: { stock: { lte: 5 } } }),
    ]);

    const thisMonthRev = totalRevenue._sum.totalAmount || 0;
    const lastMonthRev = lastMonthRevenue._sum.totalAmount || 0;
    const revenueChange = lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : "0";
    const ordersChange = ordersLastMonth > 0 ? (((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100).toFixed(1) : "0";

    return {
      revenue: { value: thisMonthRev, change: `${Number(revenueChange) >= 0 ? "+" : ""}${revenueChange}% from last month` },
      orders: { value: ordersThisMonth, change: `${Number(ordersChange) >= 0 ? "+" : ""}${ordersChange}% from last month` },
      customers: { value: totalCustomers, change: `+${newCustomersThisWeek} new this week` },
      products: { value: totalProducts, change: `${lowStockProducts} low stock` },
    };
  },

  // Revenue chart data (last 6 months)
  async getRevenueChart() {
    const months: { month: string; revenue: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const result = await prisma.order.aggregate({
        where: { status: { notIn: ["CANCELLED"] }, createdAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      });
      months.push({
        month: start.toLocaleString("en-IN", { month: "short" }),
        revenue: result._sum.totalAmount || 0,
      });
    }

    return months;
  },

  // Recent orders (real data)
  async getRecentOrders(limit: number = 5) {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return orders.map((o) => ({
      id: o.orderNumber,
      customer: `${o.user.firstName} ${o.user.lastName}`,
      total: o.totalAmount,
      status: o.status,
      date: o.createdAt.toISOString().split("T")[0],
    }));
  },

  // Analytics page: detailed metrics
  async getAnalytics(period: string = "30d") {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      ordersByStatus,
      revenueByDay,
      topProducts,
      customerGrowth,
      avgOrderValue,
      totalTickets,
      openTickets,
    ] = await Promise.all([
      // Orders by status
      prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      // Revenue by day (last N days, sample 30 points)
      prisma.$queryRaw<{ date: string; revenue: number }[]>`
        SELECT DATE("createdAt") as date, SUM("totalAmount") as revenue
        FROM orders
        WHERE "createdAt" >= ${startDate} AND status != 'CANCELLED'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      // Top 5 products by order count
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { createdAt: { gte: startDate }, status: { notIn: ["CANCELLED"] } } },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      // Customer growth by month
      prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(*)::int as count
        FROM users
        WHERE role = 'CUSTOMER' AND "createdAt" >= ${startDate}
        GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,
      // Average order value
      prisma.order.aggregate({
        where: { createdAt: { gte: startDate }, status: { notIn: ["CANCELLED"] } },
        _avg: { totalAmount: true },
        _count: true,
      }),
      // Total support tickets
      prisma.supportTicket.count({ where: { createdAt: { gte: startDate } } }),
      // Open tickets
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

    // Enrich top products with names
    const productIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return {
      ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count })),
      revenueByDay: revenueByDay.map((r) => ({ date: String(r.date), revenue: Number(r.revenue) })),
      topProducts: topProducts.map((p) => ({
        name: productMap.get(p.productId) || "Unknown",
        quantity: p._sum.quantity || 0,
        revenue: p._sum.price || 0,
      })),
      customerGrowth: customerGrowth.map((c) => ({ month: c.month, count: Number(c.count) })),
      avgOrderValue: avgOrderValue._avg.totalAmount || 0,
      totalOrders: avgOrderValue._count,
      totalTickets,
      openTickets,
    };
  },
};
```

**Step 2: Create analytics.controller.ts**

```typescript
import type { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";

export const analyticsController = {
  async getDashboardStats(_req: Request, res: Response) {
    const stats = await analyticsService.getDashboardStats();
    res.json({ success: true, ...stats });
  },

  async getRevenueChart(_req: Request, res: Response) {
    const data = await analyticsService.getRevenueChart();
    res.json({ success: true, data });
  },

  async getRecentOrders(_req: Request, res: Response) {
    const orders = await analyticsService.getRecentOrders();
    res.json({ success: true, orders });
  },

  async getAnalytics(req: Request, res: Response) {
    const period = (req.query.period as string) || "30d";
    const data = await analyticsService.getAnalytics(period);
    res.json({ success: true, ...data });
  },
};
```

**Step 3: Create analytics.routes.ts**

```typescript
import { Router, type IRouter } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/dashboard", asyncHandler(analyticsController.getDashboardStats));
router.get("/revenue-chart", asyncHandler(analyticsController.getRevenueChart));
router.get("/recent-orders", asyncHandler(analyticsController.getRecentOrders));
router.get("/detailed", asyncHandler(analyticsController.getAnalytics));

export { router as analyticsRouter };
```

**Step 4: Mount in app.ts**

Add import: `import { analyticsRouter } from "./routes/analytics.routes";`
Add route: `app.use("/api/v1/admin/analytics", analyticsRouter);` (with other admin routes)

---

### Task 2: Admin — Live Dashboard (replace mock data)

**Files:**
- Modify: `apps/admin/src/app/(admin)/dashboard/page.tsx`
- Modify: `apps/admin/src/components/dashboard/revenue-chart.tsx`
- Modify: `apps/admin/src/components/dashboard/recent-orders.tsx`

**Context:** Replace all mock/hardcoded data with real API calls. Admin api-client returns full response. Dashboard endpoints: `GET /admin/analytics/dashboard`, `GET /admin/analytics/revenue-chart`, `GET /admin/analytics/recent-orders`.

**Step 1: Update dashboard page**

Replace entire contents of `apps/admin/src/app/(admin)/dashboard/page.tsx`:

```tsx
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
```

**Step 2: Update revenue chart**

Replace entire contents of `apps/admin/src/components/dashboard/revenue-chart.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api-client";
import { Card, Skeleton } from "@/components/ui";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: () => api.get("/admin/analytics/revenue-chart"),
  });

  const chartData = data?.data || [];

  return (
    <Card>
      <h3 className="text-base font-semibold text-charcoal mb-4">Revenue Overview</h3>
      {isLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => [formatINR(Number(value)), "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid #E5E5E5" }} />
              <Area type="monotone" dataKey="revenue" stroke="#2D5016" fill="#2D5016" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
```

**Step 3: Update recent orders**

Replace entire contents of `apps/admin/src/components/dashboard/recent-orders.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, Badge, Skeleton } from "@/components/ui";
import { formatPrice } from "@earth-revibe/shared";

const statusVariant: Record<string, "success" | "info" | "warning" | "default" | "error"> = {
  DELIVERED: "success",
  SHIPPED: "info",
  PROCESSING: "warning",
  PENDING: "default",
  CANCELLED: "error",
};

export function RecentOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: () => api.get("/admin/analytics/recent-orders"),
  });

  const orders = data?.orders || [];

  return (
    <Card padding={false}>
      <div className="px-6 py-4 border-b border-light-gray">
        <h3 className="text-base font-semibold text-charcoal">Recent Orders</h3>
      </div>
      {isLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-gray bg-off-white/50">
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Total</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                <th className="text-left px-6 py-3 font-medium text-medium-gray">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b border-light-gray last:border-0 hover:bg-off-white/50">
                  <td className="px-6 py-3">
                    <Link href={`/orders/${order.id}`} className="font-medium text-deep-earth hover:underline">{order.id}</Link>
                  </td>
                  <td className="px-6 py-3 text-dark-gray">{order.customer}</td>
                  <td className="px-6 py-3 text-charcoal">{formatPrice(order.total)}</td>
                  <td className="px-6 py-3">
                    <Badge variant={statusVariant[order.status] || "default"}>{order.status}</Badge>
                  </td>
                  <td className="px-6 py-3 text-medium-gray">{order.date}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-medium-gray">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
```

---

### Task 3: Admin — Analytics Page

**Files:**
- Create: `apps/admin/src/app/(admin)/analytics/page.tsx`

**Context:** Detailed analytics page with period selector (7d/30d/90d), charts for revenue trends and order status breakdown, top products table, customer growth. Uses Recharts (needs `dynamic` import with `ssr: false`). Admin api-client: `GET /admin/analytics/detailed?period=30d`. Recharts components: AreaChart, BarChart, PieChart.

**Code:**

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { TrendingUp, ShoppingBag, Users, Headset } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Card, Badge, Button, Skeleton } from "@/components/ui";
import { formatPrice } from "@earth-revibe/shared";
import { StatCard } from "@/components/dashboard/stat-card";

const AnalyticsCharts = dynamic(() => import("@/components/analytics/analytics-charts"), { ssr: false });

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => api.get(`/admin/analytics/detailed?period=${period}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">Analytics</h1>
        <div className="flex gap-1 bg-off-white rounded-lg p-1">
          {[
            { label: "7 Days", value: "7d" },
            { label: "30 Days", value: "30d" },
            { label: "90 Days", value: "90d" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value ? "bg-white text-charcoal shadow-sm" : "text-medium-gray hover:text-charcoal"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
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
            change={`in last ${period === "7d" ? "7 days" : period === "90d" ? "90 days" : "30 days"}`}
            changeType="neutral"
            icon={ShoppingBag}
          />
          <StatCard
            title="New Customers"
            value={String(data?.customerGrowth?.reduce((s: number, c: any) => s + c.count, 0) || 0)}
            change={`in last ${period === "7d" ? "7 days" : period === "90d" ? "90 days" : "30 days"}`}
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Support Tickets"
            value={String(data?.totalTickets || 0)}
            change={`${data?.openTickets || 0} open`}
            changeType={data?.openTickets > 5 ? "negative" : "neutral"}
            icon={Headset}
          />
        </div>
      )}

      {/* Charts */}
      {!isLoading && data && <AnalyticsCharts data={data} />}

      {/* Top Products */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Top Products</h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                  <td className="py-2 text-right text-charcoal font-medium">{formatPrice(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Order Status Breakdown */}
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
                <Badge variant={
                  s.status === "DELIVERED" ? "success" :
                  s.status === "CANCELLED" ? "error" :
                  s.status === "PROCESSING" || s.status === "SHIPPED" ? "warning" : "default"
                }>
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
```

Also create `apps/admin/src/components/analytics/analytics-charts.tsx`:

```tsx
"use client";

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

interface AnalyticsChartsProps {
  data: {
    revenueByDay: { date: string; revenue: number }[];
    customerGrowth: { month: string; count: number }[];
  };
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Revenue Trend */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Revenue Trend</h3>
        <div className="h-[280px]">
          {data.revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueByDay} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#8E8E8E" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                />
                <YAxis tick={{ fontSize: 11, fill: "#8E8E8E" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => [formatINR(Number(value)), "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid #E5E5E5" }} />
                <Area type="monotone" dataKey="revenue" stroke="#2D5016" fill="#2D5016" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-medium-gray text-center pt-20">No revenue data yet</p>
          )}
        </div>
      </Card>

      {/* Customer Growth */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Customer Growth</h3>
        <div className="h-[280px]">
          {data.customerGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.customerGrowth} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8E8E8E" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E5E5" }} />
                <Bar dataKey="count" fill="#3D2B1F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-medium-gray text-center pt-20">No customer data yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
```

---

### Task 4: Storefront — SEO for Product Pages

**Files:**
- Create: `apps/storefront/src/app/(shop)/products/[slug]/layout.tsx`

**Context:** The current product page at `apps/storefront/src/app/(shop)/products/[slug]/page.tsx` is a client component and cannot export `generateMetadata`. In Next.js App Router, we can add a `layout.tsx` as a server component alongside the page and export `generateMetadata` from it. The layout fetches product data server-side for SEO, while the page remains a client component for interactivity.

The storefront api-client is client-side only. For server-side data fetching in metadata, use `fetch` directly against the API base URL. The API_URL is `process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"`.

**Code:**

```tsx
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const title = product.name;
  const description = product.description?.slice(0, 160) || `Shop ${product.name} - sustainable clothing from Earth Revibe`;
  const image = product.images?.[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Earth Revibe`,
      description,
      ...(image && { images: [{ url: image }] }),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

### Task 5: Storefront — SEO for Blog & Category Pages

**Files:**
- Create: `apps/storefront/src/app/(shop)/blog/[slug]/layout.tsx`
- Create: `apps/storefront/src/app/(shop)/categories/[slug]/layout.tsx`

**Context:** Same pattern as product SEO — server component layout with `generateMetadata`. Blog posts have `metaTitle` and `metaDescription` fields. Categories have `name` and `description`.

**Blog layout code:**

```tsx
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function getBlogPost(slug: string) {
  try {
    const res = await fetch(`${API_URL}/blog/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || `Read ${post.title} on the Earth Revibe blog`;
  const image = post.featuredImage;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Earth Revibe Blog`,
      description,
      type: "article",
      ...(image && { images: [{ url: image }] }),
      ...(post.publishedAt && { publishedTime: post.publishedAt }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Category layout code:**

```tsx
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function getCategory(slug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return { title: "Category Not Found" };
  }

  const title = `${category.name} - Sustainable Clothing`;
  const description = category.description || `Shop ${category.name} - eco-friendly, sustainable clothing from Earth Revibe`;
  const image = category.image;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Earth Revibe`,
      description,
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

### Task 6: Verify Build

Run `pnpm turbo build` from the repo root. All apps must build successfully.
