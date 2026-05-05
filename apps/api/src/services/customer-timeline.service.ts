import { prisma } from '@earth-revibe/db';
import {
  type TimelineEvent,
  type TimelineEventType,
  type TimelineResponse,
  type TimelineQuery,
} from '@earth-revibe/shared';
import { ApiError } from '../utils/api-error';

// Customer-360 timeline. Six event sources (orders, WhatsApp, loyalty,
// support, reviews, wishlist) merged into a single chronological feed.
//
// Pagination strategy: each source query over-fetches `limit` rows ordered by
// timestamp DESC, optionally filtered by `cursor` (older-than). The merged
// result is sorted and sliced to `limit`. The next cursor is the timestamp of
// the last returned item, so the next page sees `before < cursor`.
//
// WhatsApp linkage: WhatsAppMessageEvent has no userId — it's keyed by
// `waId` (wa.me ID, digits-only phone). We match against the user's phone
// after the same digit-strip normalization the send helpers use.

const OVERFETCH_PER_SOURCE = 200;

function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

function shouldFetch(types: TimelineEventType[] | undefined, kind: TimelineEventType): boolean {
  return !types || types.includes(kind);
}

export const customerTimelineService = {
  async getTimeline(userId: string, query: TimelineQuery): Promise<TimelineResponse> {
    const { cursor, limit, types } = query;

    const customer = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    const before = cursor ? new Date(cursor) : null;
    const tsFilter = before ? { lt: before } : undefined;
    const phoneDigits = digitsOnly(customer.phone);

    const [orders, whatsappEvents, loyalty, tickets, reviews, wishlist] = await Promise.all([
      shouldFetch(types, 'order')
        ? prisma.order.findMany({
            where: { userId, ...(tsFilter ? { createdAt: tsFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: OVERFETCH_PER_SOURCE,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true,
              _count: { select: { items: true } },
            },
          })
        : Promise.resolve([]),

      shouldFetch(types, 'whatsapp') && phoneDigits
        ? prisma.whatsAppMessageEvent.findMany({
            where: { waId: phoneDigits, ...(tsFilter ? { eventAt: tsFilter } : {}) },
            orderBy: { eventAt: 'desc' },
            take: OVERFETCH_PER_SOURCE,
            select: {
              id: true,
              status: true,
              conversationCategory: true,
              errorMessage: true,
              eventAt: true,
            },
          })
        : Promise.resolve([]),

      shouldFetch(types, 'loyalty')
        ? prisma.loyaltyTransaction.findMany({
            where: { userId, ...(tsFilter ? { createdAt: tsFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: OVERFETCH_PER_SOURCE,
            select: {
              id: true,
              type: true,
              points: true,
              description: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      shouldFetch(types, 'support')
        ? prisma.supportTicket.findMany({
            where: { userId, ...(tsFilter ? { createdAt: tsFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: OVERFETCH_PER_SOURCE,
            select: {
              id: true,
              ticketNumber: true,
              subject: true,
              status: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      shouldFetch(types, 'review')
        ? prisma.review.findMany({
            where: { userId, ...(tsFilter ? { createdAt: tsFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: OVERFETCH_PER_SOURCE,
            select: {
              id: true,
              rating: true,
              createdAt: true,
              product: { select: { name: true, slug: true } },
            },
          })
        : Promise.resolve([]),

      shouldFetch(types, 'wishlist')
        ? prisma.wishlistItem.findMany({
            where: { userId, ...(tsFilter ? { createdAt: tsFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: OVERFETCH_PER_SOURCE,
            select: {
              id: true,
              createdAt: true,
              product: { select: { name: true, slug: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const events: TimelineEvent[] = [
      ...orders.map(
        (o): TimelineEvent => ({
          kind: 'order',
          ts: o.createdAt.toISOString(),
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: Number(o.totalAmount),
          itemCount: o._count.items,
        })
      ),
      ...whatsappEvents.map(
        (e): TimelineEvent => ({
          kind: 'whatsapp',
          ts: e.eventAt.toISOString(),
          id: e.id,
          status: e.status,
          conversationCategory: e.conversationCategory,
          errorMessage: e.errorMessage,
        })
      ),
      ...loyalty.map(
        (l): TimelineEvent => ({
          kind: 'loyalty',
          ts: l.createdAt.toISOString(),
          id: l.id,
          type: l.type,
          points: l.points,
          description: l.description,
        })
      ),
      ...tickets.map(
        (t): TimelineEvent => ({
          kind: 'support',
          ts: t.createdAt.toISOString(),
          id: t.id,
          ticketNumber: t.ticketNumber,
          subject: t.subject,
          status: t.status,
        })
      ),
      ...reviews.map(
        (r): TimelineEvent => ({
          kind: 'review',
          ts: r.createdAt.toISOString(),
          id: r.id,
          rating: r.rating,
          productName: r.product.name,
          productSlug: r.product.slug,
        })
      ),
      ...wishlist.map(
        (w): TimelineEvent => ({
          kind: 'wishlist',
          ts: w.createdAt.toISOString(),
          id: w.id,
          productName: w.product.name,
          productSlug: w.product.slug,
        })
      ),
    ];

    // DESC chronological — newest first. Tiebreak on id for deterministic
    // pagination when two events share a timestamp (e.g. an order created
    // alongside its first loyalty txn).
    events.sort((a, b) => {
      if (a.ts === b.ts) return a.id < b.id ? 1 : -1;
      return a.ts < b.ts ? 1 : -1;
    });

    const sliced = events.slice(0, limit);
    const nextCursor =
      sliced.length === limit && events.length > limit ? sliced[sliced.length - 1].ts : null;

    return {
      events: sliced,
      nextCursor,
      customer,
    };
  },
};
