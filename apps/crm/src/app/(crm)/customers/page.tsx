'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink } from 'lucide-react';
import { Card, Badge } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { useCustomers, type CrmCustomerRow } from '@/hooks/use-customers';

const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  (typeof window !== 'undefined' ? window.location.origin.replace('crm', 'admin') : '');

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function relativeTime(date: string | null) {
  if (!date) return 'never';
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function CrmCustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search by 250ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useCustomers({
    page,
    limit: 25,
    search: debouncedSearch || undefined,
    sortBy: 'lastLoginAt',
    sortOrder: 'desc',
  });

  const rows = data?.customers ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Customers</h1>
        <p className="text-sm text-medium-gray mt-1">
          Search by name, email, or phone. Click a row to open the customer 360 timeline.
        </p>
      </div>

      <Card>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customers..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border bg-surface focus:outline-none focus:border-accent"
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
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-error">Failed to load customers.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-text-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-medium-gray text-sm">
            {debouncedSearch ? `No customers matching "${debouncedSearch}".` : 'No customers yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-charcoal text-left">
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Contact</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Orders</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Loyalty</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">
                    Last seen
                  </th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide text-right">
                    Admin
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: CrmCustomerRow) => {
                  const fullName = `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || '—';
                  return (
                    <tr key={row.id} className="border-b border-border hover:bg-surface-tint/30">
                      <td className="px-2 py-3 font-medium">
                        <Link
                          href={`/customers/${row.id}`}
                          className="hover:text-accent transition-colors"
                        >
                          {fullName}
                        </Link>
                      </td>
                      <td className="px-2 py-3">
                        <div className="text-xs">{row.email}</div>
                        {row.phone && <div className="text-xs text-text-muted">{row.phone}</div>}
                      </td>
                      <td className="px-2 py-3">{row._count.orders}</td>
                      <td className="px-2 py-3">{row.loyaltyPoints}</td>
                      <td className="px-2 py-3 text-xs text-text-muted">
                        <div>{relativeTime(row.lastLoginAt)}</div>
                        <div className="text-[10px]">{formatDate(row.lastLoginAt)}</div>
                      </td>
                      <td className="px-2 py-3">
                        {row.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="error">Suspended</Badge>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {ADMIN_URL && (
                          <Link
                            href={`${ADMIN_URL}/customers/${row.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                          >
                            Edit
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <span className="text-xs text-medium-gray">
              Page {data.page} of {data.totalPages} ({data.total} customers)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
