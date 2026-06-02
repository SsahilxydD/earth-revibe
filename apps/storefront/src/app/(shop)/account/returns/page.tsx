'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatDate, getImageUrl } from '@/lib/utils';
import { returnStatusMeta } from '@/lib/order-status';

interface ReturnItemView {
  id: string;
  quantity: number;
  productName?: string;
  productImage?: string | null;
  variantSize?: string;
  variantColor?: string;
}

interface ReturnView {
  id: string;
  type: string;
  status: string;
  refundAmount: number | null;
  returnAwbCode: string | null;
  returnTrackingUrl: string | null;
  items: ReturnItemView[];
  order?: { orderNumber: string };
  createdAt: string;
}

export default function ReturnsPage() {
  const { data: returns, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: () => api.get<ReturnView[]>('/returns'),
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

  if (!returns || returns.length === 0) {
    return (
      <div
        style={{
          padding: '80px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>No returns yet</p>
        <p style={{ marginTop: 8, fontSize: 11, fontWeight: 300, color: '#BBB', maxWidth: 280 }}>
          You can request a return or exchange from a delivered order within 72 hours of delivery.
        </p>
        <Link
          href="/account/orders"
          style={{
            marginTop: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 46,
            padding: '0 32px',
            border: '1px solid #000',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 2,
            color: '#000',
            textDecoration: 'none',
          }}
        >
          VIEW ORDERS
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px 28px 28px' }}>
      <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
        RETURNS &amp; EXCHANGES
      </span>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {returns.map((r) => {
          const meta = returnStatusMeta(r.status);
          return (
            <div key={r.id} style={{ border: '1px solid #EEE', borderRadius: 6, padding: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
                    {r.type === 'EXCHANGE' ? 'Exchange' : 'Refund'}
                    {r.order && (
                      <>
                        {' · '}
                        <Link
                          href={`/account/orders/${r.order.orderNumber}`}
                          style={{ color: '#666', textDecoration: 'underline' }}
                        >
                          #{r.order.orderNumber}
                        </Link>
                      </>
                    )}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                <span
                  style={{ fontSize: 11, fontWeight: 400, color: meta.color, letterSpacing: 0.5 }}
                >
                  {meta.label}
                </span>
              </div>

              {/* Item thumbnails */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {r.items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 36,
                        aspectRatio: '3/4',
                        background: '#F5F5F5',
                        flexShrink: 0,
                      }}
                    >
                      {it.productImage && (
                        <img
                          src={getImageUrl(it.productImage, 100)}
                          alt={it.productName || ''}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 300, color: '#666' }}>
                      {it.productName}
                      {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                    </span>
                  </div>
                ))}
              </div>

              {r.type === 'REFUND' && (
                <p style={{ marginTop: 10, fontSize: 10, fontWeight: 300, color: '#999' }}>
                  Refunds are processed by our team once your item is received.
                </p>
              )}
              {r.returnAwbCode && (
                <p style={{ marginTop: 8, fontSize: 10, fontWeight: 300, color: '#666' }}>
                  Pickup AWB: {r.returnAwbCode}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
