import { z } from 'zod';

// CRM engagement rules — declarative escalation. v1 supports two action
// types; SEND_WHATSAPP_TEMPLATE is omitted on purpose so cron never
// fires bulk template sends (Meta fair-use class — see
// feedback_meta_fair_use.md memory).

export const engagementRuleTriggerSchema = z.enum(['CART_ABANDONED_READ_NO_PURCHASE']);
export type EngagementRuleTrigger = z.infer<typeof engagementRuleTriggerSchema>;

export const engagementRuleActionTypeSchema = z.enum(['FLAG_FOR_MANUAL_OUTREACH', 'SEND_EMAIL']);
export type EngagementRuleActionType = z.infer<typeof engagementRuleActionTypeSchema>;

// Each action type has its own payload shape. Discriminated union so the
// admin UI and cron evaluator can both narrow correctly.
export const flagForManualOutreachPayloadSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type FlagForManualOutreachPayload = z.infer<typeof flagForManualOutreachPayloadSchema>;

export const sendEmailPayloadSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});
export type SendEmailPayload = z.infer<typeof sendEmailPayloadSchema>;

export type EngagementRuleActionPayload = FlagForManualOutreachPayload | SendEmailPayload;

// Validates the (actionType, actionPayload) pair together — refuses an
// FLAG_FOR_MANUAL_OUTREACH payload paired with SEND_EMAIL action, etc.
export const engagementRuleSchema = z
  .object({
    name: z.string().min(1).max(120),
    trigger: engagementRuleTriggerSchema,
    delayHours: z.number().int().min(1).max(720), // up to 30 days
    actionType: engagementRuleActionTypeSchema,
    actionPayload: z.unknown(),
    isActive: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    const payloadSchema =
      val.actionType === 'FLAG_FOR_MANUAL_OUTREACH'
        ? flagForManualOutreachPayloadSchema
        : sendEmailPayloadSchema;
    const result = payloadSchema.safeParse(val.actionPayload);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ['actionPayload', ...(issue.path as Array<string | number>)],
        });
      });
    }
  });

export type EngagementRuleInput = z.infer<typeof engagementRuleSchema>;

export interface EngagementRuleRow {
  id: string;
  name: string;
  trigger: EngagementRuleTrigger;
  delayHours: number;
  actionType: EngagementRuleActionType;
  actionPayload: EngagementRuleActionPayload;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fireCount: number;
}

export interface EngagementRulesResponse {
  rules: EngagementRuleRow[];
}
