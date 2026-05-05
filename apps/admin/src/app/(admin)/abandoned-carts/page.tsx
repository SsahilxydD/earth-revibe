'use client';

import { useState } from 'react';
import { Search, Send, RefreshCw, Mail, MessageCircle, ChevronDown } from 'lucide-react';
import { Button, Badge, Card } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { toast } from '@earth-revibe/ui/toast';
import {
  useAbandonedCarts,
  useRunAbandonedCartSweep,
  useSendAbandonedCartRecovery,
  type AbandonedCartRow,
} from '@/hooks/use-abandoned-carts';

const STATUS_TABS: { value: 'pending' | 'sent' | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Already sent' },
  { value: 'all', label: 'All' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AbandonedCartsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'pending' | 'sent' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAbandonedCarts({
    page,
    limit: 25,
    status,
    search: search || undefined,
  });

  const runSweep = useRunAbandonedCartSweep();
  const sendOne = useSendAbandonedCartRecovery();

  const rows = data?.data ?? [];
  const stats = data?.stats;

  const onRunSweep = async () => {
    try {
      const r = await runSweep.mutateAsync();
      if (!r.ran) {
        toast.success('A sweep is already running — try again in a moment.');
        return;
      }
      const total = r.tracked + r.deferred;
      if (total === 0) {
        toast.success('No carts needed recovery right now.');
      } else {
        toast.success(
          `Sweep done: WhatsApp ${r.whatsapped}, email ${r.emailed + r.guestEmailed}, deferred ${r.deferred}`
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Sweep failed');
    }
  };

  const onSendOne = async (row: AbandonedCartRow) => {
    if (!row.hasWhatsApp && !row.hasEmail) {
      toast.error('No contact info on this cart.');
      return;
    }
    try {
      const r = await sendOne.mutateAsync({ kind: row.kind, id: row.id });
      if (r.deferred) {
        toast.error('All channels failed transiently — will retry on the next sweep.');
        return;
      }
      const channels: string[] = [];
      if (r.whatsapped) channels.push('WhatsApp');
      if (r.emailed) channels.push('email');
      if (channels.length > 0) {
        toast.success(`Sent via ${channels.join(' + ')}`);
      } else {
        toast.success('Marked as processed (no channel succeeded).');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Abandoned Carts</h1>
          <p className="text-sm text-medium-gray mt-1">
            Carts idle for 30+ minutes. Cron runs every 15 min — use buttons below to send manually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={runSweep.isPending}
            onClick={onRunSweep}
            title="Trigger the recovery sweep immediately for every eligible cart"
          >
            <RefreshCw size={16} className={runSweep.isPending ? 'animate-spin' : ''} />
            {runSweep.isPending ? 'Running…' : 'Run sweep now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="text-xs text-medium-gray uppercase tracking-wide">Pending</div>
            <div className="text-2xl font-semibold mt-1">{stats.totalPending}</div>
          </Card>
          <Card>
            <div className="text-xs text-medium-gray uppercase tracking-wide">Recovery sent</div>
            <div className="text-2xl font-semibold mt-1">{stats.totalSent}</div>
          </Card>
          <Card>
            <div className="text-xs text-medium-gray uppercase tracking-wide">
              Logged-in pending
            </div>
            <div className="text-2xl font-semibold mt-1">{stats.usersPending}</div>
          </Card>
          <Card>
            <div className="text-xs text-medium-gray uppercase tracking-wide">Guest pending</div>
            <div className="text-2xl font-semibold mt-1">{stats.guestsPending}</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
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
              placeholder="Search by email, phone, or first name…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border bg-surface focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex border border-border">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={`px-4 py-2 text-sm transition-colors ${
                  status === t.value
                    ? 'bg-charcoal text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-error">Failed to load abandoned carts.</p>
            <Button variant="secondary" onClick={() => refetch()} className="mt-3">
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-medium-gray text-sm">
            No abandoned carts in the last 14 days for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-charcoal text-left">
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">
                    Channels
                  </th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Items</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Total</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">
                    Last activity
                  </th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-2 py-3 font-medium text-xs uppercase tracking-wide text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isOpen = expanded === row.id;
                  return (
                    <>
                      <tr
                        key={row.id}
                        className="border-b border-border-subtle hover:bg-surface-tint/30"
                      >
                        <td className="px-2 py-3">
                          <button
                            onClick={() => setExpanded(isOpen ? null : row.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            <ChevronDown
                              size={14}
                              className={`text-medium-gray transition-transform ${
                                isOpen ? '' : '-rotate-90'
                              }`}
                            />
                            <div>
                              <div className="font-medium">
                                {row.firstName || (row.kind === 'guest' ? 'Guest' : 'User')}
                              </div>
                              <div className="text-xs text-medium-gray">
                                {row.email || row.phone || '—'}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5">
                            {row.hasWhatsApp && (
                              <span title="WhatsApp available" className="text-success">
                                <MessageCircle size={14} />
                              </span>
                            )}
                            {row.hasEmail && (
                              <span title="Email available" className="text-info">
                                <Mail size={14} />
                              </span>
                            )}
                            {!row.hasWhatsApp && !row.hasEmail && (
                              <span className="text-xs text-medium-gray">none</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-medium-gray">{row.itemCount}</td>
                        <td className="px-2 py-3 font-medium">{formatCurrency(row.cartTotal)}</td>
                        <td className="px-2 py-3 text-medium-gray text-xs">
                          <div>{timeAgo(row.updatedAt)}</div>
                          <div className="text-[10px]">{formatDate(row.updatedAt)}</div>
                        </td>
                        <td className="px-2 py-3">
                          {row.recoverySentAt ? (
                            <Badge variant="success">Sent</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                          {row.kind === 'guest' && (
                            <Badge variant="default" className="ml-1">
                              Guest
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Button
                            variant="primary"
                            disabled={sendOne.isPending || (!row.hasWhatsApp && !row.hasEmail)}
                            onClick={() => onSendOne(row)}
                            title={
                              row.hasWhatsApp && row.hasEmail
                                ? 'Send via WhatsApp + email'
                                : row.hasWhatsApp
                                  ? 'Send via WhatsApp'
                                  : row.hasEmail
                                    ? 'Send via email'
                                    : 'No contact info'
                            }
                          >
                            <Send size={14} />
                            {row.recoverySentAt ? 'Resend' : 'Send'}
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-border-subtle bg-surface-tint/20">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="text-xs text-medium-gray uppercase mb-2 tracking-wide">
                              Cart contents
                            </div>
                            <ul className="space-y-1 text-sm">
                              {row.items.map((it, i) => (
                                <li key={i} className="flex justify-between">
                                  <span>
                                    {it.name}{' '}
                                    <span className="text-medium-gray">× {it.quantity}</span>
                                  </span>
                                  <span className="text-medium-gray">
                                    {formatCurrency(it.price * it.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {row.recoverySentAt && (
                              <div className="text-xs text-medium-gray mt-3">
                                Recovery sent {timeAgo(row.recoverySentAt)} (
                                {formatDate(row.recoverySentAt)})
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
            <span className="text-xs text-medium-gray">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total}{' '}
              carts)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
