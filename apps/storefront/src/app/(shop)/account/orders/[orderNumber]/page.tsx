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

const TIMELINE_STEPS = [
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PLACED: 0,
  CONFIRMED: 1,
  PROCESSING: 1,
  SHIPPED: 2,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#22C55E',
  SHIPPED: '#8B5CF6',
  CANCELLED: '#999',
  PLACED: '#EAB308',
  CONFIRMED: '#3B82F6',
  PROCESSING: '#3B82F6',
  OUT_FOR_DELIVERY: '#3B82F6',
  RETURNED: '#999',
  REFUNDED: '#999',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#3B82F6';
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 14,
            fontWeight: 400,
            color: '#000',
            marginBottom: 8,
          }}
        >
          Order Not Found
        </h2>
        <Link
          href="/account/orders"
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 12,
            fontWeight: 300,
            color: '#999',
            textDecoration: 'none',
          }}
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const currentStep = STATUS_ORDER[order.status] ?? 0;
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div>
      {/* Back link */}
      <Link
        href="/account/orders"
        style={{
          display: 'inline-block',
          fontFamily: 'var(--font-inter)',
          fontSize: 12,
          fontWeight: 300,
          color: '#999',
          textDecoration: 'none',
        }}
      >
        &larr; Back
      </Link>

      {/* Header */}
      <div
        style={{
          marginTop: 32,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 16,
              fontWeight: 400,
              color: '#000',
            }}
          >
            #{order.orderNumber}
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: 'var(--font-inter)',
              fontSize: 12,
              fontWeight: 300,
              color: '#999',
            }}
          >
            {formatDate(order.createdAt)}
          </div>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 11,
            fontWeight: 400,
            color: getStatusColor(order.status),
            letterSpacing: '0.5px',
            textTransform: 'capitalize',
          }}
        >
          {formatStatusLabel(order.status)}
        </span>
      </div>

      {/* Status Timeline */}
      {!isCancelled && (
        <div style={{ marginTop: 32 }}>
          {/* Dots and lines row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {TIMELINE_STEPS.map((step, i) => {
              const stepIndex = i + 1;
              const isCompleted = currentStep >= stepIndex;
              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: i < TIMELINE_STEPS.length - 1 ? 1 : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? '#000' : '#D1D5DB',
                      flexShrink: 0,
                    }}
                  />
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 0,
                        borderTop: `1px dashed ${currentStep > stepIndex ? '#000' : '#D1D5DB'}`,
                        marginLeft: 0,
                        marginRight: 0,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* Labels row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {TIMELINE_STEPS.map((step) => (
              <span
                key={step.key}
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 9,
                  fontWeight: 400,
                  color: '#000',
                }}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Items
        </div>
        <div>
          {order.items.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: 14,
                padding: '16px 0',
                borderTop: index === 0 ? '1px solid #F0F0F0' : 'none',
                borderBottom: '1px solid #F0F0F0',
              }}
            >
              {/* Image placeholder */}
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
              {/* Info */}
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 13,
                    fontWeight: 400,
                    color: '#000',
                  }}
                >
                  {item.productName}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 11,
                    fontWeight: 300,
                    color: '#999',
                  }}
                >
                  {item.variantSize ? `Size: ${item.variantSize}` : ''}
                  {item.variantSize && item.quantity ? ' \u00B7 ' : ''}
                  Qty: {item.quantity}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 13,
                    fontWeight: 400,
                    color: '#000',
                  }}
                >
                  {formatPrice(item.totalPrice)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Summary */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Payment Summary
        </div>
        <div>
          {/* Subtotal */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                fontWeight: 300,
                color: '#999',
              }}
            >
              Subtotal
            </span>
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                fontWeight: 400,
                color: '#000',
              }}
            >
              {formatPrice(order.subtotal)}
            </span>
          </div>
          {/* Shipping */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                fontWeight: 300,
                color: '#999',
              }}
            >
              Shipping
            </span>
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                fontWeight: 400,
                color: '#000',
              }}
            >
              {Number(order.shippingAmount) === 0 ? 'Free' : formatPrice(order.shippingAmount)}
            </span>
          </div>
          {/* Discount */}
          {Number(order.discountAmount) > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 12,
                  fontWeight: 300,
                  color: '#999',
                }}
              >
                Discount
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 12,
                  fontWeight: 400,
                  color: '#22C55E',
                }}
              >
                -{formatPrice(order.discountAmount)}
              </span>
            </div>
          )}
          {/* Total divider + total */}
          <div style={{ borderTop: '1px solid #E5E5E5', marginTop: 6, paddingTop: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 14,
                  fontWeight: 400,
                  color: '#000',
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#000',
                }}
              >
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Track Package button */}
      {!isCancelled && (
        <div style={{ marginTop: 32 }}>
          <button
            style={{
              width: '100%',
              height: 50,
              border: '1px solid #000',
              backgroundColor: 'transparent',
              fontFamily: 'var(--font-inter)',
              fontSize: 12,
              fontWeight: 400,
              color: '#000',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Track Package
          </button>
        </div>
      )}
    </div>
  );
}
