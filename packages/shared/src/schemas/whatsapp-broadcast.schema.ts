import { z } from 'zod';

export const whatsAppBroadcastSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('recipients'),
    recipients: z
      .array(
        z.object({
          phone: z
            .string()
            .regex(/^\+?\d{10,15}$/, 'Phone must be digits only, optional leading +'),
          firstName: z.string().max(80).optional(),
          name: z.string().max(120).optional(),
          city: z.string().max(80).optional(),
        })
      )
      .min(1)
      .max(5000),
  }),
  z.object({
    type: z.literal('customers'),
    hasPlacedOrder: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('travel-applications'),
    statuses: z
      .array(z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED']))
      .min(1)
      .default(['APPROVED']),
    city: z.string().max(80).optional(),
  }),
]);

export const whatsAppBroadcastSchema = z.object({
  templateName: z.string().min(1).optional(),
  params: z.array(z.string().max(500)).max(10).default([]),
  buttonUrlParam: z.string().max(500).optional(),
  source: whatsAppBroadcastSourceSchema,
  concurrency: z.number().int().min(1).max(20).default(5),
  dryRun: z.boolean().default(false),
});

export type WhatsAppBroadcastInput = z.infer<typeof whatsAppBroadcastSchema>;
export type WhatsAppBroadcastSource = z.infer<typeof whatsAppBroadcastSourceSchema>;

// ── Utility "trip opening" broadcast to existing applicants ──────────
// A separate endpoint because:
//   - Audience is always TravelApplication rows (enforces transactional hook)
//   - Each recipient gets per-row personalization (name, applicationNumber)
//   - Utility templates deliver reliably, unlike Marketing (MM_LITE throttled)
export const whatsAppTripOpeningBroadcastSchema = z.object({
  city: z.string().min(1).max(80),
  // e.g. "Ahmedabad weekender", "Goa new year batch"
  tripLabel: z.string().min(1).max(100),
  statuses: z
    .array(z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED']))
    .min(1)
    .default(['PENDING', 'APPROVED', 'WAITLISTED']),
  templateName: z.string().min(1).optional(),
  concurrency: z.number().int().min(1).max(20).default(5),
  dryRun: z.boolean().default(false),
});

export type WhatsAppTripOpeningBroadcastInput = z.infer<typeof whatsAppTripOpeningBroadcastSchema>;
