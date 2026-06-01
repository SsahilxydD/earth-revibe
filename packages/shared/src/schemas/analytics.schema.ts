import { z } from 'zod';

// Drives the admin analytics dashboard. Supply either an explicit date range
// (startDate/endDate as ISO strings) or a preset window; when both are absent
// the service falls back to a default window. `channel` and `categoryId` narrow
// the P&L figures, bestseller, and breakdowns.
export const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'mtd', 'ytd']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  channel: z.enum(['all', 'online', 'offline']).default('all'),
  categoryId: z.string().optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
