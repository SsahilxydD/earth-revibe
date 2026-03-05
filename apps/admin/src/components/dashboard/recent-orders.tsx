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
