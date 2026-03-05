"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Badge, Card, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

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

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["my-order", orderNumber],
    queryFn: () => api.get(`/orders/${orderNumber}`),
  });

  const cancelOrder = useMutation({
    mutationFn: (reason: string) => api.post(`/orders/${orderNumber}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-order", orderNumber] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Order cancelled");
      setShowCancel(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to cancel order"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-medium-gray">Order not found</p>
        <Link href="/account/orders" className="text-forest-green hover:underline mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  const canCancel = ["PLACED", "CONFIRMED", "PROCESSING"].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/account/orders" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-charcoal">Order #{order.orderNumber}</h1>
            <Badge variant={statusVariant[order.status] || "default"}>
              {order.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-medium-gray mt-1">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Items</h3>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 py-2 border-b border-light-gray last:border-0">
                  <div className="w-16 h-16 rounded-lg bg-off-white flex items-center justify-center flex-shrink-0">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package size={24} className="text-medium-gray" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-charcoal">{item.productName}</p>
                    <p className="text-sm text-medium-gray">
                      {item.variantSize} / {item.variantColor} &middot; Qty: {item.quantity}
                    </p>
                    <p className="text-sm font-medium text-charcoal mt-1">{formatPrice(item.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-light-gray space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-medium-gray">Subtotal</span>
                <span className="text-charcoal">{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-forest-green">
                  <span>Discount {order.discountCode ? `(${order.discountCode.code})` : ""}</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              {Number(order.shippingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Shipping</span>
                  <span className="text-charcoal">{formatPrice(order.shippingAmount)}</span>
                </div>
              )}
              {order.loyaltyPointsUsed > 0 && (
                <div className="flex justify-between text-forest-green">
                  <span>Loyalty Points ({order.loyaltyPointsUsed} pts)</span>
                  <span>-{formatPrice(order.loyaltyPointsUsed)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-light-gray">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {order.statusHistory?.map((entry: any, i: number) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1 ${i === 0 ? "bg-forest-green" : "bg-light-gray"}`} />
                    {i < order.statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-light-gray mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[entry.status] || "default"}>
                        {entry.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-medium-gray">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    {entry.note && <p className="text-sm text-dark-gray mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {order.address && (
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-3">Shipping Address</h3>
              <div className="text-sm text-dark-gray space-y-1">
                <p className="font-medium text-charcoal">{order.address.fullName}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>{order.address.city}, {order.address.state} {order.address.pinCode}</p>
                <p>{order.address.phone}</p>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-3">Payment</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-medium-gray">Status</span>
                <Badge variant={order.payment?.status === "CAPTURED" ? "success" : "warning"}>
                  {order.payment?.status || "Pending"}
                </Badge>
              </div>
              {order.payment?.paidAt && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Paid</span>
                  <span className="text-charcoal">{formatDateTime(order.payment.paidAt)}</span>
                </div>
              )}
            </div>
          </Card>

          {canCancel && (
            <Card>
              {!showCancel ? (
                <Button variant="ghost" className="w-full text-error" onClick={() => setShowCancel(true)}>
                  Cancel Order
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-charcoal">Reason for cancellation</p>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Why are you cancelling?"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={cancelReason.length < 5 || cancelOrder.isPending}
                      onClick={() => cancelOrder.mutate(cancelReason)}
                    >
                      Confirm Cancel
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>
                      Keep Order
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {order.loyaltyPointsEarned > 0 && (
            <Card>
              <p className="text-sm text-medium-gray">
                You earned <span className="font-semibold text-forest-green">{order.loyaltyPointsEarned} loyalty points</span> from this order!
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
