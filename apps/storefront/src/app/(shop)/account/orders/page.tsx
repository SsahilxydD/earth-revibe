"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { formatPrice, formatDate } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
  confirmed: { bg: "bg-blue-100", text: "text-blue-800" },
  processing: { bg: "bg-blue-100", text: "text-blue-800" },
  shipped: { bg: "bg-purple-100", text: "text-purple-800" },
  delivered: { bg: "bg-green-100", text: "text-green-800" },
  cancelled: { bg: "bg-red-100", text: "text-red-800" },
  returned: { bg: "bg-gray-100", text: "text-gray-800" },
};

function OrderStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      className={`inline-block rounded-[var(--badge-radius)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {status}
    </span>
  );
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<Order[]>("/orders"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)]">
          <Package size={28} className="text-[var(--color-muted)]" />
        </div>
        <h2 className="mb-2 text-lg font-bold">No Orders Yet</h2>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          When you place an order, it will appear here.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#2a2a2a]"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-sm font-bold uppercase tracking-wider">
        Order History
      </h2>

      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.orderNumber}`}
            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-surface)]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">
                  #{order.orderNumber}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--color-muted)]">
                <span>{formatDate(order.createdAt)}</span>
                <span>
                  {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                {formatPrice(order.total)}
              </span>
              <ChevronRight
                size={18}
                className="text-[var(--color-muted)]"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
