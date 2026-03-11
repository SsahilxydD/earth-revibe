"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Eye } from "lucide-react";
import { Button, Badge, Card, Select } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrders } from "@/hooks/use-orders";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "RETURNED", label: "Returned" },
  { value: "REFUNDED", label: "Refunded" },
];

const statusVariant: Record<string, "success" | "warning" | "default" | "error" | "info"> = {
  PLACED: "info",
  CONFIRMED: "info",
  PROCESSING: "warning",
  SHIPPED: "warning",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
  CANCELLED: "error",
  RETURNED: "error",
  REFUNDED: "default",
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useOrders({
    page,
    limit: 20,
    status: status || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Orders</h1>
        <p className="text-sm text-medium-gray mt-1">Manage and track customer orders</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray" />
            <input
              type="text"
              placeholder="Search by order #, email, or name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Orders table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray bg-off-white/50">
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Payment</th>
                  <th className="text-right px-6 py-3 font-medium text-medium-gray">Total</th>
                  <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-light-gray last:border-0">
                    <td className="px-6 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-36" />
                    </td>
                    <td className="px-6 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-3 flex justify-end"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-3"><Skeleton className="h-6 w-6 ml-auto rounded-md" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load orders</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : !data?.orders?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No orders found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Date</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Payment</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Total</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order: any) => (
                    <tr key={order.id} className="border-b border-light-gray last:border-0 hover:bg-off-white/50">
                      <td className="px-6 py-3">
                        <Link href={`/orders/${order.orderNumber}`} className="font-medium text-deep-earth hover:underline">
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <p className="text-charcoal">{order.user?.firstName} {order.user?.lastName}</p>
                          <p className="text-xs text-medium-gray">{order.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant[order.status] || "default"}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={order.payment?.status === "CAPTURED" ? "success" : order.payment?.status === "FAILED" ? "error" : "warning"}>
                          {order.payment?.status || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-charcoal">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end">
                          <Link
                            href={`/orders/${order.orderNumber}`}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="View"
                          >
                            <Eye size={16} className="text-dark-gray" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} orders)
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
