'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package, Truck, CheckCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatPrice, formatDate, getImageUrl } from '@/lib/utils';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  variantSize: string;
  variantColor: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  address: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pinCode: string;
    phone: string;
  };
  payment: {
    method: string | null;
    status: string;
  } | null;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
}

const TIMELINE_STEPS = [
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PLACED: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.get<OrderDetail>(`/orders/${orderNumber}`),
    enabled: !!orderNumber,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-lg font-bold">Order Not Found</h2>
        <Link href="/account/orders" className="text-sm text-[var(--color-muted)] hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const currentStep = STATUS_ORDER[order.status] ?? 0;
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div>
      <Link
        href="/account/orders"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={16} />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Order #{order.orderNumber}</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        {isCancelled && (
          <span className="rounded-[var(--badge-radius)] bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-800">
            Cancelled
          </span>
        )}
      </div>

      {/* Status Timeline */}
      {!isCancelled && (
        <div className="mb-8 rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            {TIMELINE_STEPS.map((step, i) => {
              const isCompleted = currentStep >= i + 1;
              const isCurrent = currentStep === i + 1;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    {i > 0 && (
                      <div
                        className={`absolute right-1/2 h-0.5 w-[calc(100%+2rem)] sm:w-[calc(100%+4rem)] ${
                          isCompleted ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                        }`}
                        style={{ transform: 'translateX(-50%)' }}
                      />
                    )}
                    <div
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                        isCompleted || isCurrent
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
                      }`}
                    >
                      <step.icon size={16} />
                    </div>
                  </div>
                  <span
                    className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${
                      isCompleted || isCurrent
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Items</h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-xl border border-[var(--color-border)] p-4"
            >
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)]">
                {item.productImage && (
                  <img
                    src={getImageUrl(item.productImage, 160)}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{item.productName}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {[item.variantSize, item.variantColor].filter(Boolean).join(' / ')}
                </p>
                <p className="text-xs text-[var(--color-muted)]">Qty: {item.quantity}</p>
              </div>
              <p className="shrink-0 text-sm font-bold">{formatPrice(item.totalPrice)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Shipping Address */}
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Shipping Address</h3>
          <div className="space-y-1 text-sm text-[var(--color-muted)]">
            <p className="font-medium text-[var(--color-text)]">{order.address.fullName}</p>
            <p>{order.address.line1}</p>
            {order.address.line2 && <p>{order.address.line2}</p>}
            <p>
              {order.address.city}, {order.address.state} {order.address.pinCode}
            </p>
            <p>Phone: {order.address.phone}</p>
          </div>
        </div>

        {/* Payment & Totals */}
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Payment Summary</h3>
          {order.payment && (
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              {order.payment.method || 'Online Payment'}
            </p>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Discount</span>
                <span className="text-green-600">-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Shipping</span>
              <span>
                {Number(order.shippingAmount) === 0 ? 'Free' : formatPrice(order.shippingAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Tax</span>
              <span>{formatPrice(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-bold">
              <span>Total</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
