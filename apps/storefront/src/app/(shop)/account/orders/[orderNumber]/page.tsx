'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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

const STATUS_ORDER: Record<string, number> = {
  PLACED: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

const STATUS_COLOR: Record<string, string> = {
  PLACED: '#EAB308',
  CONFIRMED: '#3B82F6',
  PROCESSING: '#3B82F6',
  SHIPPED: '#8B5CF6',
  OUT_FOR_DELIVERY: '#8B5CF6',
  DELIVERED: '#22C55E',
  CANCELLED: '#999',
  RETURNED: '#999',
  REFUNDED: '#999',
};

const TIMELINE_LABELS = ['Confirmed', 'Shipped', 'Delivered'];

function formatStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(\w)(\w*)/g, (_, f, r) => f + r.toLowerCase());
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.get<OrderDetail>(`/orders/${orderNumber}`),
    enabled: !!orderNumber,
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!order) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>Order not found</p>
        <Link
          href="/account/orders"
          style={{
            marginTop: 16,
            fontSize: 12,
            fontWeight: 300,
            color: '#999',
            textDecoration: 'none',
          }}
        >
          ← Back to orders
        </Link>
      </div>
    );
  }

  const currentStep = STATUS_ORDER[order.status] ?? 0;
  const isCancelled = order.status === 'CANCELLED';
  // Map to 3-step: Confirmed(1), Shipped(3), Delivered(4)
  const timelineProgress = [currentStep >= 1, currentStep >= 3, currentStep >= 4];

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header — order number + date left, status right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
              fontSize: 16,
              fontWeight: 400,
              color: '#000',
              letterSpacing: 0.5,
            }}
          >
            #{order.orderNumber}
          </span>
          <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>
            {formatDate(order.createdAt)}
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: STATUS_COLOR[order.status] || '#999',
            letterSpacing: 0.5,
          }}
        >
          {formatStatus(order.status)}
        </span>
      </div>

      {/* Timeline — dots + dashed lines + labels */}
      {!isCancelled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Dots row */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {TIMELINE_LABELS.map((label, i) => (
              <div key={label} style={{ display: 'contents' }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 9999,
                    backgroundColor: timelineProgress[i] ? '#000' : '#CCC',
                    flexShrink: 0,
                  }}
                />
                {i < TIMELINE_LABELS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 0,
                      borderTop: `1px dashed ${timelineProgress[i + 1] ? '#000' : '#CCC'}`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          {/* Labels row */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {TIMELINE_LABELS.map((label, i) => (
              <span
                key={label}
                style={{
                  fontSize: 9,
                  fontWeight: 400,
                  color: timelineProgress[i] ? '#000' : '#CCC',
                  letterSpacing: 0.3,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>ITEMS</p>
        <div style={{ marginTop: 16 }}>
          {order.items.map((item, i) => (
            <div key={item.id}>
              <div
                style={{ display: 'flex', gap: 14, padding: '16px 0', alignItems: 'flex-start' }}
              >
                <div
                  style={{
                    width: 56,
                    height: 72,
                    backgroundColor: '#F5F5F5',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {item.productImage && (
                    <img
                      src={getImageUrl(item.productImage, 160)}
                      alt={item.productName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}
                >
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
                    {item.productName}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 300, color: '#999' }}>
                    {[
                      item.variantSize && `Size: ${item.variantSize}`,
                      item.variantColor && item.variantColor,
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                    {item.quantity > 0 && `  ·  Qty: ${item.quantity}`}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
                    {formatPrice(item.totalPrice)}
                  </span>
                </div>
              </div>
              {i < order.items.length - 1 && (
                <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Summary */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
          PAYMENT SUMMARY
        </p>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>Subtotal</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
              {formatPrice(order.subtotal)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>Shipping</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
              {Number(order.shippingAmount) === 0 ? 'Free' : formatPrice(order.shippingAmount)}
            </span>
          </div>
          {Number(order.discountAmount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>Discount</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#22C55E' }}>
                -{formatPrice(order.discountAmount)}
              </span>
            </div>
          )}
          {Number(order.taxAmount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>Tax</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
                {formatPrice(order.taxAmount)}
              </span>
            </div>
          )}
          <div style={{ height: 12 }} />
          <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
          <div style={{ height: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Track Package button — outline, 50px, 1px black border */}
      {!isCancelled && (
        <button
          style={{
            width: '100%',
            height: 50,
            border: '1px solid #000',
            backgroundColor: 'transparent',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 2,
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          TRACK PACKAGE
        </button>
      )}
    </div>
  );
}
