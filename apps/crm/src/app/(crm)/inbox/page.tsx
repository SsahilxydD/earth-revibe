'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CornerDownLeft,
  Image as ImageIcon,
  Mic,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Card, Badge, Button } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import type { WhatsAppInboundMessageRow } from '@earth-revibe/shared';
import { useWhatsAppInbound } from '@/hooks/use-whatsapp-inbound';

const FILTERS: {
  value: 'all' | 'linked' | 'unlinked' | 'replies';
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'linked', label: 'From customers' },
  { value: 'unlinked', label: 'From prospects' },
  { value: 'replies', label: 'Replies only' },
];

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(ts: string) {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function MessageTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'image':
    case 'sticker':
      return <ImageIcon size={14} className="text-text-secondary" />;
    case 'audio':
      return <Mic size={14} className="text-text-secondary" />;
    case 'video':
      return <ImageIcon size={14} className="text-text-secondary" />;
    case 'document':
      return <FileText size={14} className="text-text-secondary" />;
    default:
      return <MessageSquare size={14} className="text-text-secondary" />;
  }
}

function InboundRow({ msg }: { msg: WhatsAppInboundMessageRow }) {
  const senderName = msg.user
    ? `${msg.user.firstName ?? ''} ${msg.user.lastName ?? ''}`.trim() || msg.user.email
    : null;

  return (
    <div className="flex gap-3 py-4">
      <div className="flex-shrink-0 mt-1">
        <MessageTypeIcon type={msg.messageType} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {msg.user ? (
              <Link
                href={`/customers/${msg.user.id}`}
                className="text-sm font-medium hover:text-accent truncate"
              >
                {senderName}
              </Link>
            ) : (
              <span className="text-sm font-medium text-text-secondary">+{msg.fromWaId}</span>
            )}
            {msg.repliedTo && (
              <span title="Reply to one of our outbound templates">
                <CornerDownLeft size={12} className="text-text-muted" />
              </span>
            )}
            {!msg.user && <Badge variant="default">prospect</Badge>}
          </div>
          <span
            className="text-[11px] text-text-muted whitespace-nowrap"
            title={formatTimestamp(msg.receivedAt)}
          >
            {timeAgo(msg.receivedAt)}
          </span>
        </div>

        {msg.text ? (
          <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap break-words">
            {msg.text}
          </p>
        ) : (
          <p className="text-sm text-text-muted italic mt-1">
            {msg.messageType === 'unknown' ? 'Unknown payload' : `${msg.messageType} attachment`}
            {msg.mediaUrl ? ' (media id stored — fetch via Meta API)' : ''}
          </p>
        )}

        {msg.user?.phone && (
          <div className="text-[11px] text-text-muted mt-1.5">
            {msg.user.phone}
            {msg.user.email ? ` · ${msg.user.email}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [filter, setFilter] = useState<'all' | 'linked' | 'unlinked' | 'replies'>('all');

  const apiParams = useMemo(() => {
    if (filter === 'linked') return { linkedUser: 'true' as const };
    if (filter === 'unlinked') return { linkedUser: 'false' as const };
    if (filter === 'replies') return { repliesOnly: 'true' as const };
    return {};
  }, [filter]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useWhatsAppInbound(apiParams);

  const messages = useMemo(() => data?.pages.flatMap((p) => p.messages) ?? [], [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Inbox</h1>
          <p className="text-sm text-medium-gray mt-1">
            Inbound WhatsApp messages from customers and prospects.{' '}
            <Link
              href="https://business.whatsapp.com/"
              target="_blank"
              className="underline inline-flex items-center gap-0.5"
            >
              Reply via WhatsApp Business <ExternalLink size={11} />
            </Link>
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                filter === f.value
                  ? 'bg-charcoal text-white border-charcoal'
                  : 'bg-surface text-text-secondary border-border hover:text-text-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-error">Failed to load inbox.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-text-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-medium-gray text-sm">
            No inbound messages yet for this filter. New replies appear here as they land.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((m) => (
              <InboundRow key={m.id} msg={m} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="pt-4 mt-4 border-t border-border flex justify-center">
            <Button
              variant="secondary"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
