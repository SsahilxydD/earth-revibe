'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Card, Select, PageHeader, Skeleton, EmptyState } from '@earth-revibe/ui';
import { ReturnStatus, ReturnType } from '@earth-revibe/shared';
import { useReturns } from '@/hooks/use-returns';

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

interface ReturnRow {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  items: { id: string; productName?: string; quantity: number }[];
  order?: {
    orderNumber: string;
    user?: { firstName: string; lastName: string; email: string } | null;
  };
}

interface ReturnsResponse {
  returns: ReturnRow[];
  total: number;
  page: number;
  totalPages: number;
}

export function ReturnsView({ initialStatus }: { initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus ?? '');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useReturns({
    page,
    limit: 20,
    ...(status ? { status: status as ReturnStatus } : {}),
    ...(type ? { type: type as ReturnType } : {}),
  });
  const res = data as ReturnsResponse | undefined;
  const returns = res?.returns ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Returns" subtitle="Customer return & exchange requests" />

      <Card>
        <div className="flex flex-wrap gap-3">
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All statuses' },
              ...Object.values(ReturnStatus).map((s) => ({
                value: s,
                label: s.replace(/_/g, ' '),
              })),
            ]}
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All types' },
              { value: ReturnType.REFUND, label: 'Refund' },
              { value: ReturnType.EXCHANGE, label: 'Exchange' },
            ]}
          />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : returns.length === 0 ? (
          <EmptyState heading="No returns" body="No return requests match these filters yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border,#e5e5e5)] text-left text-xs uppercase tracking-wider text-[var(--color-muted,#737373)]">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Items</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Requested</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => {
                  const cust = r.order?.user;
                  const custName = cust
                    ? `${cust.firstName} ${cust.lastName}`.trim() || cust.email
                    : '—';
                  const itemCount = r.items.reduce((n, it) => n + it.quantity, 0);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--color-border,#f0f0f0)] hover:bg-[var(--color-surface,#fafafa)]"
                    >
                      <td className="px-3 py-3">
                        {r.order ? (
                          <Link
                            href={`/orders/${r.order.orderNumber}`}
                            className="font-mono text-xs underline"
                          >
                            #{r.order.orderNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-3">{custName}</td>
                      <td className="px-3 py-3">{r.type === 'EXCHANGE' ? 'Exchange' : 'Refund'}</td>
                      <td className="px-3 py-3">{itemCount}</td>
                      <td className="px-3 py-3">
                        <Badge variant={STATUS_VARIANT[r.status] || 'default'}>
                          {r.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-[var(--color-muted,#737373)]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/returns/${r.id}`} className="text-xs underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {res && res.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-[var(--color-muted,#737373)]">
              Page {res.page} of {res.totalPages}
            </span>
            <button
              disabled={page >= res.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
