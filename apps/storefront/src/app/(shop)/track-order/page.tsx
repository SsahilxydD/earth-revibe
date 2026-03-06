"use client";

import { useState, type FormEvent } from "react";
import {
  Package,
  CheckCircle,
  Truck,
  MapPin,
  Circle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderData {
  orderNumber: string;
  status: string;
  createdAt: string;
  totalAmount: number | string;
  items?: { id: string; productName: string; quantity: number }[];
  statusHistory?: { id: string; status: string; createdAt: string; note?: string }[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRACKING_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

const STATUS_META: Record<
  string,
  { label: string; icon: React.ElementType; description: string }
> = {
  PLACED: {
    label: "Order Placed",
    icon: Package,
    description: "Your order has been received",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle,
    description: "Order confirmed by seller",
  },
  PROCESSING: {
    label: "Processing",
    icon: Circle,
    description: "Your order is being prepared",
  },
  SHIPPED: {
    label: "Shipped",
    icon: Truck,
    description: "Your order is on its way",
  },
  DELIVERED: {
    label: "Delivered",
    icon: MapPin,
    description: "Order delivered successfully",
  },
};

const statusBadgeVariant: Record<string, "success" | "warning" | "default" | "error" | "info"> = {
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const data = await api.get<OrderData>(`/orders/${encodeURIComponent(orderNumber.trim())}`);
      setOrder(data);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 401) {
        setError(
          "This order requires authentication. Please log in to your account to view order details."
        );
      } else if (apiErr.status === 404) {
        setError(
          "Order not found. Please check your order number and try again."
        );
      } else {
        setError(
          apiErr.message || "Something went wrong. Please try again later."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setError(null);
    setOrder(null);
  }

  /* ---- Derive timeline state from order ---- */
  const currentStatusIndex = order
    ? TRACKING_STATUSES.indexOf(
        order.status as (typeof TRACKING_STATUSES)[number]
      )
    : -1;

  return (
    <div className="max-w-lg mx-auto py-12 lg:py-16 px-4">
      {/* Title */}
      <h1 className="font-heading text-3xl lg:text-4xl text-chocolate text-center mb-2">
        Track Your Order
      </h1>
      <p className="text-center text-muted-text mb-8">
        Enter your order number and email to track your order status.
      </p>

      {/* ---- Form ---- */}
      {!order && !error && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="orderNumber"
              className="block text-sm font-medium text-secondary-text mb-1"
            >
              Order Number
            </label>
            <input
              id="orderNumber"
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. ER-20260305-ABC123"
              className="w-full border border-border-color rounded-lg px-4 py-3 text-primary-text placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-[var(--sage)] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-secondary-text mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email used for the order"
              className="w-full border border-border-color rounded-lg px-4 py-3 text-primary-text placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-[var(--sage)] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--chocolate)] text-white w-full py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Tracking...
              </>
            ) : (
              "Track Order"
            )}
          </button>
        </form>
      )}

      {/* ---- Error State ---- */}
      {error && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-error" />
          </div>
          <p className="text-secondary-text">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-[var(--chocolate)] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ---- Result Display ---- */}
      {order && (
        <div className="space-y-6">
          {/* Order summary header */}
          <div className="bg-card-bg rounded-xl p-5 border border-border-color">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-muted-text">Order Number</p>
                <p className="text-lg font-semibold text-primary-text">
                  {order.orderNumber}
                </p>
              </div>
              <Badge variant={statusBadgeVariant[order.status] || "default"}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-text">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>

          {/* Status Timeline */}
          <div className="bg-card-bg rounded-xl p-5 border border-border-color">
            <h2 className="font-heading text-xl text-chocolate mb-5">
              Order Status
            </h2>

            <div className="relative">
              {TRACKING_STATUSES.map((status, index) => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;

                const isPast = currentStatusIndex >= 0 && index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const isFuture = currentStatusIndex < 0 || index > currentStatusIndex;

                /* Find matching history entry for timestamp */
                const historyEntry = order.statusHistory?.find(
                  (h) => h.status === status
                );

                return (
                  <div key={status} className="flex gap-4 relative">
                    {/* Vertical line + icon */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCurrent
                            ? "bg-[var(--sage)] text-white"
                            : isPast
                              ? "bg-success/20 text-success"
                              : "bg-light-gray text-muted-text"
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Icon size={16} />
                        )}
                      </div>
                      {/* Connector line (not on last item) */}
                      {index < TRACKING_STATUSES.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 min-h-8 ${
                            isPast ? "bg-success/40" : "bg-light-gray"
                          }`}
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className={`pb-6 ${isFuture ? "opacity-40" : ""}`}>
                      <p
                        className={`font-medium text-sm ${
                          isCurrent
                            ? "text-[var(--chocolate)]"
                            : isPast
                              ? "text-primary-text"
                              : "text-muted-text"
                        }`}
                      >
                        {meta.label}
                      </p>
                      <p className="text-xs text-muted-text mt-0.5">
                        {meta.description}
                      </p>
                      {historyEntry && (
                        <p className="text-xs text-secondary-text mt-1">
                          {formatDateTime(historyEntry.createdAt)}
                        </p>
                      )}
                      {historyEntry?.note && (
                        <p className="text-xs text-secondary-text italic mt-0.5">
                          {historyEntry.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Back / track another */}
          <button
            onClick={() => {
              setOrder(null);
              setOrderNumber("");
              setEmail("");
            }}
            className="w-full border border-border-color text-secondary-text py-3 rounded-lg font-medium hover:bg-card-bg transition-colors"
          >
            Track Another Order
          </button>
        </div>
      )}
    </div>
  );
}
