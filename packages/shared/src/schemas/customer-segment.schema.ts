import { z } from 'zod';

// CRM customer segments — DSL for the saved-cohort filter language. v1 is
// deliberately flat: an array of (field, op, value) triples ANDed together.
// Each field has a fixed value type; the schema's superRefine enforces it.

export const SEGMENT_FIELDS = [
  /// Sum of order totals (₹). Number filter, gte/lte/eq.
  'totalSpent',
  /// Number of orders the customer has ever placed. Number filter.
  'orderCount',
  /// Days since the customer's most recent order (or never-ordered → very large).
  'lastOrderDaysAgo',
  /// Days since the User row was created.
  'accountAgeDays',
  /// Loyalty points balance.
  'loyaltyPoints',
  /// True/false: User.phone is non-null.
  'hasPhone',
  /// True/false: customer has placed ≥1 order.
  'hasOrders',
] as const;

export type SegmentField = (typeof SEGMENT_FIELDS)[number];

const NUMBER_FIELDS = new Set<SegmentField>([
  'totalSpent',
  'orderCount',
  'lastOrderDaysAgo',
  'accountAgeDays',
  'loyaltyPoints',
]);

const BOOLEAN_FIELDS = new Set<SegmentField>(['hasPhone', 'hasOrders']);

export const SEGMENT_OPS = ['eq', 'gte', 'lte'] as const;
export type SegmentOp = (typeof SEGMENT_OPS)[number];

const segmentFilterSchema = z
  .object({
    field: z.enum(SEGMENT_FIELDS),
    op: z.enum(SEGMENT_OPS),
    value: z.union([z.number(), z.boolean()]),
  })
  .superRefine((val, ctx) => {
    const isNumberField = NUMBER_FIELDS.has(val.field);
    const isBoolField = BOOLEAN_FIELDS.has(val.field);
    if (isNumberField && typeof val.value !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Field ${val.field} requires a number value`,
        path: ['value'],
      });
    }
    if (isBoolField) {
      if (typeof val.value !== 'boolean') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Field ${val.field} requires a boolean value`,
          path: ['value'],
        });
      }
      if (val.op !== 'eq') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Field ${val.field} only supports the eq operator`,
          path: ['op'],
        });
      }
    }
  });

export type SegmentFilter = z.infer<typeof segmentFilterSchema>;

export const segmentDefinitionSchema = z.object({
  filters: z.array(segmentFilterSchema).min(1).max(10),
});

export type SegmentDefinition = z.infer<typeof segmentDefinitionSchema>;

export const customerSegmentSchema = z.object({
  name: z.string().min(1).max(120),
  definition: segmentDefinitionSchema,
  isActive: z.boolean().default(true),
});

export type CustomerSegmentInput = z.infer<typeof customerSegmentSchema>;

export interface CustomerSegmentRow {
  id: string;
  name: string;
  definition: SegmentDefinition;
  memberCount: number;
  lastEvaluatedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSegmentsResponse {
  segments: CustomerSegmentRow[];
}
