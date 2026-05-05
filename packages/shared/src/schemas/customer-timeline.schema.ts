import { z } from 'zod';

// CRM customer-360 timeline. One discriminated union per event source so the
// frontend can render type-specific cards without re-querying. New sources
// land here as they wire up.

export const TIMELINE_EVENT_TYPES = [
  'order',
  'whatsapp',
  'loyalty',
  'support',
  'review',
  'wishlist',
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const orderTimelineEventSchema = z.object({
  kind: z.literal('order'),
  ts: z.string(), // ISO
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  totalAmount: z.number(),
  itemCount: z.number(),
});

export const whatsappTimelineEventSchema = z.object({
  kind: z.literal('whatsapp'),
  ts: z.string(),
  id: z.string(),
  status: z.string(), // sent | delivered | read | failed
  conversationCategory: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

export const loyaltyTimelineEventSchema = z.object({
  kind: z.literal('loyalty'),
  ts: z.string(),
  id: z.string(),
  type: z.string(), // EARNED | REDEEMED | EXPIRED | ADJUSTED | BONUS
  points: z.number(),
  description: z.string(),
});

export const supportTimelineEventSchema = z.object({
  kind: z.literal('support'),
  ts: z.string(),
  id: z.string(),
  ticketNumber: z.string(),
  subject: z.string(),
  status: z.string(),
});

export const reviewTimelineEventSchema = z.object({
  kind: z.literal('review'),
  ts: z.string(),
  id: z.string(),
  rating: z.number(),
  productName: z.string(),
  productSlug: z.string(),
});

export const wishlistTimelineEventSchema = z.object({
  kind: z.literal('wishlist'),
  ts: z.string(),
  id: z.string(),
  productName: z.string(),
  productSlug: z.string(),
});

export const timelineEventSchema = z.discriminatedUnion('kind', [
  orderTimelineEventSchema,
  whatsappTimelineEventSchema,
  loyaltyTimelineEventSchema,
  supportTimelineEventSchema,
  reviewTimelineEventSchema,
  wishlistTimelineEventSchema,
]);

export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const timelineQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  types: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? (v
            .split(',')
            .map((t) => t.trim())
            .filter((t): t is TimelineEventType =>
              (TIMELINE_EVENT_TYPES as readonly string[]).includes(t)
            ) as TimelineEventType[])
        : undefined
    ),
});

export type TimelineQuery = z.infer<typeof timelineQuerySchema>;

export interface TimelineResponse {
  events: TimelineEvent[];
  nextCursor: string | null;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
}
