"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Badge, Card } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";

const statusOptions = [
  { value: "", label: "All Orders" },
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
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
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", status, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (status) params.set("status", status);
      return api.get(`/orders?${params.toString()}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">My Orders</h1>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-40 h-9 rounded-lg border border-light-gray bg-white px-3 text-sm text-charcoal outline-none focus:border-forest-green focus:ring-2 focus:ring-forest-green/20"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !data?.orders?.length ? (
        <Card>
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-light-gray mb-4" />
            <p className="text-medium-gray mb-4">No orders yet</p>
            <Link href="/products">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.orders.map((order: any) => (
            <Link key={order.id} href={`/account/orders/${order.orderNumber}`}>
              <Card className="hover:border-forest-green/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-charcoal">#{order.orderNumber}</span>
                      <Badge variant={statusVariant[order.status] || "default"}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-medium-gray">
                      {formatDate(order.createdAt)} &middot; {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {order.items.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="w-10 h-10 rounded bg-off-white flex items-center justify-center">
                          {item.productImage ? (
                            <img src={item.productImage} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <Package size={14} className="text-medium-gray" />
                          )}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-10 h-10 rounded bg-off-white flex items-center justify-center text-xs text-medium-gray">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-semibold text-charcoal">{formatPrice(order.totalAmount)}</span>
                    <ChevronRight size={16} className="text-medium-gray" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-medium-gray">
                Page {data.page} of {data.totalPages}
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
        </div>
      )}
    </div>
  );
}
