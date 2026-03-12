"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/providers";
import { cn } from "@/lib/utils";

interface TrackFormData {
  orderNumber: string;
}

interface OrderStatus {
  orderId: string;
  status: string;
  estimatedDelivery?: string;
  timeline: {
    status: string;
    label: string;
    timestamp?: string;
    description?: string;
    isCompleted: boolean;
    isCurrent: boolean;
  }[];
}

const STATUS_ICONS: Record<string, typeof Package> = {
  placed: Clock,
  confirmed: CheckCircle,
  shipped: Truck,
  "out-for-delivery": MapPin,
  delivered: CheckCircle,
};

function OrderTimeline({ timeline }: { timeline: OrderStatus["timeline"] }) {
  return (
    <div className="space-y-0">
      {timeline.map((step, idx) => {
        const Icon = STATUS_ICONS[step.status] || Package;
        const isLast = idx === timeline.length - 1;

        return (
          <div key={step.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  step.isCompleted
                    ? "bg-green-600 text-white"
                    : step.isCurrent
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-muted)]"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-12 w-0.5",
                    step.isCompleted
                      ? "bg-green-600"
                      : "bg-[var(--color-border)]"
                  )}
                />
              )}
            </div>
            <div className="pb-10">
              <p
                className={cn(
                  "text-sm font-semibold",
                  !step.isCompleted &&
                    !step.isCurrent &&
                    "text-[var(--color-muted)]"
                )}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  {formatDate(step.timestamp)}
                </p>
              )}
              {step.description && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackOrderPage() {
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackFormData>();

  const onSubmit = async (data: TrackFormData) => {
    setIsLoading(true);
    setNotFound(false);
    setOrderStatus(null);

    try {
      const result = await api.get<OrderStatus>(
        `/orders/${data.orderNumber.trim()}/track`
      );
      setOrderStatus(result);
    } catch (error: any) {
      if (error?.status === 404) {
        setNotFound(true);
      } else {
        addToast(
          error?.message || "Failed to track order. Please try again.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wider">
          Track Your Order
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Enter your order number to see the latest status.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 flex gap-3"
      >
        <Input
          {...register("orderNumber", {
            required: "Please enter your order number",
          })}
          placeholder="Enter order number (e.g. ER-20260312-XXXX)"
          error={errors.orderNumber?.message}
          className="flex-1"
        />
        <Button type="submit" loading={isLoading} className="shrink-0 gap-2">
          <Search className="h-4 w-4" />
          Track
        </Button>
      </form>

      {isLoading && (
        <div className="mt-12 flex justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {notFound && (
        <div className="mt-12 rounded-[var(--button-radius)] border border-[var(--color-border)] p-6 text-center">
          <Package className="mx-auto h-10 w-10 text-[var(--color-muted)]" />
          <p className="mt-3 text-sm font-semibold">Order not found</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Please check your order number and try again. If the issue
            persists, contact our support team.
          </p>
        </div>
      )}

      {orderStatus && (
        <div className="mt-10">
          <div className="rounded-[var(--button-radius)] border border-[var(--color-border)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Order
                </p>
                <p className="text-sm font-bold">{orderStatus.orderId}</p>
              </div>
              <span className="rounded-[var(--badge-radius)] bg-[var(--color-primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                {orderStatus.status.replace(/-/g, " ")}
              </span>
            </div>

            {orderStatus.estimatedDelivery && (
              <div className="mt-3 rounded-[var(--badge-radius)] bg-[var(--color-surface)] px-3 py-2">
                <p className="text-xs text-[var(--color-muted)]">
                  Estimated Delivery:{" "}
                  <span className="font-semibold text-[var(--color-text)]">
                    {formatDate(orderStatus.estimatedDelivery)}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pl-2">
            <OrderTimeline timeline={orderStatus.timeline} />
          </div>
        </div>
      )}
    </div>
  );
}
