'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, Button, Modal, Textarea, Input, Skeleton, toast } from '@earth-revibe/ui';
import { useReturn, useUpdateReturnStatus } from '@/hooks/use-returns';
import { useRefundOrder } from '@/hooks/use-orders';

type BadgeVariant = 'success' | 'warning' | 'default' | 'error' | 'info';
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  REQUESTED: 'info',
  APPROVED: 'info',
  REJECTED: 'error',
  PICKED_UP: 'warning',
  RECEIVED: 'warning',
  REFUND_INITIATED: 'warning',
  COMPLETED: 'success',
};

interface ReturnDetail {
  id: string;
  type: string;
  reasonCode: string;
  reason: string | null;
  status: string;
  adminNote: string | null;
  refundAmount: number | null;
  returnAwbCode: string | null;
  returnTrackingUrl: string | null;
  replacementOrderId: string | null;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    productName?: string;
    variantSize?: string;
    variantColor?: string;
  }[];
  statusHistory?: { id: string; status: string; note: string | null; createdAt: string }[];
  order?: {
    orderNumber: string;
    user?: { firstName: string; lastName: string; email: string; phone: string | null } | null;
    address?: {
      fullName: string;
      line1: string;
      city: string;
      state: string;
      pinCode: string;
    } | null;
    payment?: { status: string; method: string | null; amount: number } | null;
  };
}

export default function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useReturn(id);
  const updateStatus = useUpdateReturnStatus();
  const refund = useRefundOrder();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const ret = data as ReturnDetail | undefined;

  if (isLoading || !ret) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isExchange = ret.type === 'EXCHANGE';
  const paymentCaptured = ret.order?.payment?.status === 'CAPTURED';

  const transition = (status: string, extra?: { adminNote?: string }) => {
    updateStatus.mutate(
      { id: ret.id, status, ...extra },
      {
        onSuccess: () => {
          toast.success(`Return marked ${status.replace(/_/g, ' ').toLowerCase()}`);
          setRejectOpen(false);
        },
        onError: (err: any) => toast.error(err?.message || 'Could not update the return'),
      }
    );
  };

  const submitRefund = () => {
    if (!ret.order) return;
    const amt = refundAmount.trim() ? Number(refundAmount) : undefined;
    refund.mutate(
      {
        orderNumber: ret.order.orderNumber,
        amount: amt,
        reason: refundReason.trim() || 'Return refund',
      },
      {
        onSuccess: () => {
          toast.success('Refund issued');
          setRefundOpen(false);
        },
        onError: (err: any) => toast.error(err?.message || 'Refund failed'),
      }
    );
  };

  const cust = ret.order?.user;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/returns" className="text-xs text-[var(--color-muted,#737373)] underline">
            ← All returns
          </Link>
          <h1 className="mt-1 text-lg font-semibold">
            {isExchange ? 'Exchange' : 'Refund'} request
            {ret.order && (
              <>
                {' · '}
                <Link
                  href={`/orders/${ret.order.orderNumber}`}
                  className="font-mono text-sm underline"
                >
                  #{ret.order.orderNumber}
                </Link>
              </>
            )}
          </h1>
        </div>
        <Badge variant={STATUS_VARIANT[ret.status] || 'default'}>
          {ret.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Actions */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          {ret.status === 'REQUESTED' && (
            <>
              <Button
                variant="primary"
                isLoading={updateStatus.isPending}
                onClick={() => transition('APPROVED')}
              >
                {isExchange ? 'Approve & ship exchange' : 'Approve'}
              </Button>
              <Button variant="danger" onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
            </>
          )}
          {(ret.status === 'APPROVED' || ret.status === 'PICKED_UP') && (
            <Button
              variant="primary"
              isLoading={updateStatus.isPending}
              onClick={() => transition('RECEIVED')}
            >
              Mark received
            </Button>
          )}
          {ret.status === 'RECEIVED' && !isExchange && paymentCaptured && (
            <Button variant="primary" onClick={() => setRefundOpen(true)}>
              Issue refund
            </Button>
          )}
          {ret.status === 'RECEIVED' && (isExchange || !paymentCaptured) && (
            <Button
              variant="primary"
              isLoading={updateStatus.isPending}
              onClick={() => transition('COMPLETED')}
            >
              Mark completed
            </Button>
          )}
          {ret.status === 'RECEIVED' && !isExchange && !paymentCaptured && (
            <span className="text-xs text-[var(--color-muted,#737373)]">
              COD / no captured payment — settle the refund manually, then mark completed.
            </span>
          )}
          {(ret.status === 'COMPLETED' || ret.status === 'REJECTED') && (
            <span className="text-sm text-[var(--color-muted,#737373)]">
              This return is closed.
            </span>
          )}
        </div>
      </Card>

      {/* Items */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold">Items</h3>
        <ul className="space-y-2 text-sm">
          {ret.items.map((it) => (
            <li key={it.id} className="flex justify-between">
              <span>
                {it.productName}
                <span className="text-[var(--color-muted,#737373)]">
                  {' '}
                  {[it.variantSize, it.variantColor].filter(Boolean).join(' / ')}
                </span>
              </span>
              <span className="text-[var(--color-muted,#737373)]">×{it.quantity}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--color-muted,#737373)]">
          Reason: {ret.reasonCode.replace(/_/g, ' ').toLowerCase()}
          {ret.reason ? ` — “${ret.reason}”` : ''}
        </p>
      </Card>

      {/* Reverse pickup + replacement */}
      {(ret.returnAwbCode || ret.replacementOrderId) && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Logistics</h3>
          {ret.returnAwbCode && (
            <p className="text-sm">
              Reverse pickup AWB:{' '}
              {ret.returnTrackingUrl ? (
                <a
                  href={ret.returnTrackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {ret.returnAwbCode}
                </a>
              ) : (
                ret.returnAwbCode
              )}
            </p>
          )}
          {ret.replacementOrderId && (
            <p className="mt-1 text-sm text-[var(--color-muted,#737373)]">
              Replacement order created for the exchange.
            </p>
          )}
        </Card>
      )}

      {/* Customer */}
      {cust && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold">Customer</h3>
          <p className="text-sm">{`${cust.firstName} ${cust.lastName}`.trim() || cust.email}</p>
          <p className="text-xs text-[var(--color-muted,#737373)]">
            {cust.email}
            {cust.phone ? ` · ${cust.phone}` : ''}
          </p>
        </Card>
      )}

      {/* History */}
      {ret.statusHistory && ret.statusHistory.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold">History</h3>
          <ul className="space-y-2 text-sm">
            {ret.statusHistory.map((h) => (
              <li key={h.id} className="flex justify-between gap-4">
                <span>
                  {h.status.replace(/_/g, ' ')}
                  {h.note ? (
                    <span className="text-[var(--color-muted,#737373)]"> — {h.note}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-muted,#737373)]">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Reject modal */}
      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject return">
        <div className="space-y-3">
          <Textarea
            label="Reason (shared internally)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={updateStatus.isPending}
              onClick={() => transition('REJECTED', { adminNote: rejectNote.trim() || undefined })}
            >
              Reject return
            </Button>
          </div>
        </div>
      </Modal>

      {/* Refund modal */}
      <Modal isOpen={refundOpen} onClose={() => setRefundOpen(false)} title="Issue refund">
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-muted,#737373)]">
            Refunds to the original payment via Razorpay. Leave the amount blank for a full-order
            refund, or enter the value of the returned items.
          </p>
          <Input
            label="Amount (₹) — optional"
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={ret.order?.payment ? String(ret.order.payment.amount) : ''}
          />
          <Textarea
            label="Reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={refund.isPending} onClick={submitRefund}>
              Issue refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
