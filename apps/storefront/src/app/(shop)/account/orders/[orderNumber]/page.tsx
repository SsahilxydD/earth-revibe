'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error';
import { useToast } from '@/providers';
import { formatPrice, formatDate, getImageUrl } from '@/lib/utils';
import { orderStatusMeta } from '@/lib/order-status';
import { ReturnRequestModal } from '@/components/returns/return-request-modal';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  productSlug: string | null;
  variantId: string;
  variantSize: string;
  variantColor: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  alreadyReturnedQty?: number;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string | null;
  statusHistory?: StatusHistoryEntry[];
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

const CANCELLABLE = ['PENDING', 'CONFIRMED'];
const TRACKABLE = ['SHIPPING', 'DELIVERED'];

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => api.get<OrderDetail>(`/orders/${orderNumber}`),
    enabled: !!orderNumber,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderNumber}/cancel`, { reason: cancelReason.trim() }),
    onSuccess: () => {
      addToast('Order cancelled', 'success');
      setCancelOpen(false);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['order', orderNumber] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => addToast(apiErrorMessage(err, 'Could not cancel this order'), 'error'),
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

  const meta = orderStatusMeta(order.status);
  const canCancel = CANCELLABLE.includes(order.status);
  const canTrack = TRACKABLE.includes(order.status);

  // Return window — 72h from delivery (server is authoritative; this gates the UI).
  const RETURN_WINDOW_HOURS = 72;
  const hoursSinceDelivery = order.deliveredAt
    ? (Date.now() - new Date(order.deliveredAt).getTime()) / 3_600_000
    : null;
  const returnWindowOpen =
    order.status === 'DELIVERED' &&
    hoursSinceDelivery !== null &&
    hoursSinceDelivery < RETURN_WINDOW_HOURS;
  const returnWindowClosed =
    order.status === 'DELIVERED' && hoursSinceDelivery !== null && !returnWindowOpen;
  const hoursLeft =
    hoursSinceDelivery !== null
      ? Math.max(0, Math.ceil(RETURN_WINDOW_HOURS - hoursSinceDelivery))
      : 0;
  // Clean milestone timeline from the server's status history: the first time
  // each status was reached, chronological. Surfaces PENDING + terminal
  // CANCELLED/RETURNED that the old fixed 3-step bar ignored.
  const milestones = (() => {
    const chrono = [...(order.statusHistory ?? [])].reverse();
    const seen = new Set<string>();
    const out: StatusHistoryEntry[] = [];
    for (const h of chrono) {
      if (!seen.has(h.status)) {
        seen.add(h.status);
        out.push(h);
      }
    }
    return out;
  })();

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
            color: meta.color,
            letterSpacing: 0.5,
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Status timeline — driven by the server's status history (real
          milestones with friendly labels + dates), including terminal states. */}
      {milestones.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>STATUS</p>
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
            {milestones.map((h, i) => {
              const m = orderStatusMeta(h.status);
              const isLatest = i === milestones.length - 1;
              return (
                <li key={h.id} style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 9999,
                      marginTop: 5,
                      backgroundColor: isLatest ? m.color : '#CCC',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span
                      style={{ fontSize: 12, fontWeight: 400, color: isLatest ? '#000' : '#666' }}
                    >
                      {m.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
                      {formatDate(h.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Shiprocket tracking activity feed — self-hides until the carrier starts
          reporting; falls back to persisted activities when Shiprocket is down. */}
      <ShipmentTracking orderNumber={order.orderNumber} />

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

      {/* Actions — track, return/exchange (post-delivery, in window), cancel. */}
      {(canTrack || canCancel || returnWindowOpen || returnWindowClosed) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {canTrack && (
            <Link
              href={`/track-order?order=${encodeURIComponent(order.orderNumber)}`}
              style={{
                width: '100%',
                height: 50,
                border: '1px solid #000',
                backgroundColor: 'transparent',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 2,
                color: '#000',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              TRACK PACKAGE
            </Link>
          )}
          {returnWindowOpen && (
            <button
              onClick={() => setReturnOpen(true)}
              style={{
                width: '100%',
                height: 50,
                border: '1px solid #000',
                backgroundColor: '#000',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 2,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              RETURN OR EXCHANGE
              <span style={{ fontSize: 9, fontWeight: 300, letterSpacing: 0.5, opacity: 0.8 }}>
                {hoursLeft}h left in your return window
              </span>
            </button>
          )}
          {returnWindowClosed && (
            <p style={{ fontSize: 11, fontWeight: 300, color: '#999', textAlign: 'center' }}>
              Your {RETURN_WINDOW_HOURS}-hour return window has closed.
            </p>
          )}
          {canCancel && (
            <button
              onClick={() => setCancelOpen(true)}
              style={{
                width: '100%',
                height: 50,
                border: '1px solid #DC2626',
                backgroundColor: 'transparent',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 2,
                color: '#DC2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              CANCEL ORDER
            </button>
          )}
        </div>
      )}

      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel order">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 300, color: '#666', lineHeight: 1.5 }}>
            Tell us why you're cancelling order #{order.orderNumber}. If you've paid, your refund is
            processed automatically.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (min 5 characters)"
            rows={3}
            style={{
              width: '100%',
              border: '1px solid #E5E5E5',
              borderRadius: 4,
              padding: 10,
              fontSize: 13,
              fontWeight: 300,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setCancelOpen(false)}
              style={{
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 1,
                background: 'transparent',
                border: '1px solid #E5E5E5',
                cursor: 'pointer',
              }}
            >
              KEEP ORDER
            </button>
            <button
              disabled={cancelReason.trim().length < 5 || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              style={{
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 1,
                background: '#DC2626',
                color: '#fff',
                border: '1px solid #DC2626',
                cursor:
                  cancelReason.trim().length < 5 || cancelMutation.isPending
                    ? 'not-allowed'
                    : 'pointer',
                opacity: cancelReason.trim().length < 5 || cancelMutation.isPending ? 0.5 : 1,
              }}
            >
              {cancelMutation.isPending ? 'CANCELLING…' : 'CONFIRM CANCEL'}
            </button>
          </div>
        </div>
      </Modal>

      <ReturnRequestModal
        orderNumber={order.orderNumber}
        items={order.items}
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
      />
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
