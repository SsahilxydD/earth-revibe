'use client';

import { useMemo, useState, use } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Download,
  Package,
  MessageCircle,
  Coins,
  LifeBuoy,
  Star,
  Heart,
} from 'lucide-react';
import { Card, Badge, Button } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import {
  TIMELINE_EVENT_TYPES,
  type TimelineEvent,
  type TimelineEventType,
} from '@earth-revibe/shared';
import { useCustomerTimeline } from '@/hooks/use-customer-timeline';

const TYPE_LABELS: Record<TimelineEventType, string> = {
  order: 'Orders',
  whatsapp: 'WhatsApp',
  loyalty: 'Loyalty',
  support: 'Support',
  review: 'Reviews',
  wishlist: 'Wishlist',
};

const TYPE_ICONS: Record<TimelineEventType, typeof Package> = {
  order: Package,
  whatsapp: MessageCircle,
  loyalty: Coins,
  support: LifeBuoy,
  review: Star,
  wishlist: Heart,
};

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function EventCard({ event }: { event: TimelineEvent }) {
  const Icon = TYPE_ICONS[event.kind];
  return (
    <div className="flex gap-3 py-3">
      <div className="flex-shrink-0 mt-1">
        <Icon size={16} className="text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <EventTitle event={event} />
          <span className="text-[11px] text-text-muted whitespace-nowrap">
            {formatTimestamp(event.ts)}
          </span>
        </div>
        <EventBody event={event} />
      </div>
    </div>
  );
}

function EventTitle({ event }: { event: TimelineEvent }) {
  switch (event.kind) {
    case 'order':
      return (
        <span className="text-sm font-medium">
          Order {event.orderNumber}{' '}
          <Badge variant="default" className="ml-1">
            {event.status}
          </Badge>
        </span>
      );
    case 'whatsapp':
      return (
        <span className="text-sm font-medium">
          WhatsApp{' '}
          <Badge variant={event.status === 'failed' ? 'error' : 'default'} className="ml-1">
            {event.status}
          </Badge>
        </span>
      );
    case 'loyalty':
      return (
        <span className="text-sm font-medium">
          Loyalty {event.type.toLowerCase()}{' '}
          <span className={event.points >= 0 ? 'text-success' : 'text-error'}>
            {event.points >= 0 ? '+' : ''}
            {event.points}
          </span>
        </span>
      );
    case 'support':
      return (
        <span className="text-sm font-medium">
          Ticket {event.ticketNumber}{' '}
          <Badge variant="default" className="ml-1">
            {event.status}
          </Badge>
        </span>
      );
    case 'review':
      return (
        <span className="text-sm font-medium">
          Review · {event.rating}★ · {event.productName}
        </span>
      );
    case 'wishlist':
      return <span className="text-sm font-medium">Wishlisted {event.productName}</span>;
  }
}

function EventBody({ event }: { event: TimelineEvent }) {
  switch (event.kind) {
    case 'order':
      return (
        <div className="text-xs text-text-muted mt-0.5">
          {event.itemCount} item{event.itemCount === 1 ? '' : 's'} ·{' '}
          {formatCurrency(event.totalAmount)}
        </div>
      );
    case 'whatsapp':
      return (
        <div className="text-xs text-text-muted mt-0.5">
          {event.conversationCategory ?? 'utility'}
          {event.errorMessage ? ` · ${event.errorMessage}` : ''}
        </div>
      );
    case 'loyalty':
      return <div className="text-xs text-text-muted mt-0.5">{event.description}</div>;
    case 'support':
      return <div className="text-xs text-text-muted mt-0.5 truncate">{event.subject}</div>;
    case 'review':
    case 'wishlist':
      return <div className="text-xs text-text-muted mt-0.5">/products/{event.productSlug}</div>;
  }
}

export default function CustomerTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activeTypes, setActiveTypes] = useState<TimelineEventType[]>([]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useCustomerTimeline({
      userId: id,
      types: activeTypes.length > 0 ? activeTypes : undefined,
    });

  const allEvents = useMemo(() => data?.pages.flatMap((p) => p.events) ?? [], [data]);
  const customer = data?.pages[0]?.customer;

  const customerName = customer
    ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email
    : '—';

  const toggleType = (t: TimelineEventType) => {
    setActiveTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const exportJSON = () => {
    if (!customer) return;
    const blob = new Blob([JSON.stringify({ customer, events: allEvents }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-${customer.id}-timeline-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/customers"
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary mb-2"
          >
            <ChevronLeft size={14} />
            All customers
          </Link>
          <h1 className="text-2xl font-semibold text-charcoal truncate">{customerName}</h1>
          {customer && (
            <p className="text-sm text-medium-gray mt-1 truncate">
              {customer.email}
              {customer.phone ? ` · ${customer.phone}` : ''}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={exportJSON}
          disabled={!customer || allEvents.length === 0}
        >
          <Download size={14} />
          Export JSON
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          {TIMELINE_EVENT_TYPES.map((t) => {
            const active = activeTypes.includes(t);
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                  active
                    ? 'bg-charcoal text-white border-charcoal'
                    : 'bg-surface text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                <Icon size={12} />
                {TYPE_LABELS[t]}
              </button>
            );
          })}
          {activeTypes.length > 0 && (
            <button
              onClick={() => setActiveTypes([])}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              Clear filters
            </button>
          )}
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
            <p className="text-error">Failed to load timeline.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-text-secondary hover:text-text-primary"
            >
              Retry
            </button>
          </div>
        ) : allEvents.length === 0 ? (
          <div className="text-center py-12 text-medium-gray text-sm">
            No events for {activeTypes.length > 0 ? 'this filter' : 'this customer yet'}.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allEvents.map((e) => (
              <EventCard key={`${e.kind}-${e.id}`} event={e} />
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
