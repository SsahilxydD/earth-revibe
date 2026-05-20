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
  PENDING: 0,
  CONFIRMED: 1,
  SHIPPING: 2,
  DELIVERED: 3,
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#EAB308',
  CONFIRMED: '#3B82F6',
  SHIPPING: '#8B5CF6',
  DELIVERED: '#22C55E',
  CANCELLED: '#999',
  RETURNED: '#999',
};

const TIMELINE_LABELS = ['Confirmed', 'Shipping', 'Delivered'];

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
  const isCancelled = order.status === 'CANCELLED' || order.status === 'RETURNED';
  // Three-step timeline: Confirmed (1), Shipping (2), Delivered (3).
  const timelineProgress = [currentStep >= 1, currentStep >= 2, currentStep >= 3];

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

      {/* Shiprocket tracking activity feed (only when the order has been picked up
          and the carrier started reporting). Falls back to persisted activities
          when Shiprocket is unreachable. */}
      {!isCancelled && <ShipmentTracking orderNumber={order.orderNumber} />}

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
                    aspectRatio: '3 / 4',
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

interface TrackingResponse {
  available: boolean;
  tracked: boolean;
  awbCode: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  currentStatusDescription?: string;
  etd?: string;
  activities: Array<{
    date: string;
    status: string;
    activity: string;
    location: string;
  }>;
  error?: string;
  lastSyncAt?: string | null;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function ShipmentTracking({ orderNumber }: { orderNumber: string }) {
  const { data, isLoading } = useQuery<TrackingResponse>({
    queryKey: ['order-tracking', orderNumber],
    queryFn: async () => {
      // Server-truth: hitting /shipping/track triggers a live Shiprocket fetch
      // that also persists status + activities into our DB, so this page is
      // always either current or shows persisted history as the fallback.
      const res = await api.get<{ data: TrackingResponse } | TrackingResponse>(
        `/shipping/track/${orderNumber}`
      );
      // Controller wraps in { success, data } — unwrap both shapes for safety.
      return 'data' in res && (res as any).data ? (res as any).data : (res as TrackingResponse);
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ paddingTop: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>TRACKING</p>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner />
          <span style={{ fontSize: 11, color: '#999' }}>Checking Shiprocket…</span>
        </div>
      </div>
    );
  }

  if (!data || !data.tracked) return null; // No AWB yet — nothing to show.

  const isStale = !data.available;
  const fallbackNote = isStale
    ? `Carrier system temporarily unavailable. Showing last known activity (synced ${formatRelative(data.lastSyncAt)}).`
    : `Synced from Shiprocket ${formatRelative(data.lastSyncAt)}.`;

  return (
    <div style={{ paddingTop: 8 }}>
      <p style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>TRACKING</p>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.courierName && (
          <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
            {data.courierName} · AWB {data.awbCode}
          </span>
        )}
        <span style={{ fontSize: 10, fontWeight: 300, color: isStale ? '#B45309' : '#999' }}>
          {fallbackNote}
        </span>
      </div>

      {data.activities.length === 0 ? (
        <p style={{ marginTop: 12, fontSize: 11, fontWeight: 300, color: '#999' }}>
          No carrier scans yet — your package will start appearing here once it's picked up.
        </p>
      ) : (
        <ol
          style={{
            marginTop: 16,
            paddingLeft: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            listStyle: 'none',
          }}
        >
          {data.activities.slice(0, 12).map((a, i) => (
            <li key={`${a.date}-${a.status}-${i}`} style={{ display: 'flex', gap: 12 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 9999,
                  marginTop: 6,
                  backgroundColor: i === 0 ? '#000' : '#CCC',
                  flexShrink: 0,
                }}
              />
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}
              >
                <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>{a.status}</span>
                {a.activity && (
                  <span style={{ fontSize: 11, fontWeight: 300, color: '#666' }}>{a.activity}</span>
                )}
                <span style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
                  {formatDate(a.date)}
                  {a.location && ` · ${a.location}`}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
