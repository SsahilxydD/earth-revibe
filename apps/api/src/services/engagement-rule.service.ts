import { Resend } from 'resend';
import { prisma, type Prisma } from '@earth-revibe/db';
import type {
  EngagementRuleInput,
  EngagementRuleRow,
  EngagementRuleActionPayload,
  SendEmailPayload,
} from '@earth-revibe/shared';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Engagement-rule CRUD + cron evaluator. v1: one trigger
// (CART_ABANDONED_READ_NO_PURCHASE), two safe actions (FLAG_FOR_MANUAL_OUTREACH,
// SEND_EMAIL). WhatsApp template send is intentionally NOT supported here —
// see feedback_meta_fair_use.md memory.

const FROM_EMAIL = 'Earth Revibe <hello@earthrevibe.com>';
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function rowToShape(
  row: Prisma.EngagementRuleGetPayload<{ include: { _count: { select: { fires: true } } } }>
): EngagementRuleRow {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    delayHours: row.delayHours,
    actionType: row.actionType,
    actionPayload: row.actionPayload as EngagementRuleActionPayload,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fireCount: row._count.fires,
  };
}

export const engagementRuleService = {
  async list(): Promise<EngagementRuleRow[]> {
    const rows = await prisma.engagementRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { fires: true } } },
    });
    return rows.map(rowToShape);
  },

  async get(id: string): Promise<EngagementRuleRow> {
    const row = await prisma.engagementRule.findUnique({
      where: { id },
      include: { _count: { select: { fires: true } } },
    });
    if (!row) throw ApiError.notFound('Engagement rule not found');
    return rowToShape(row);
  },

  async create(input: EngagementRuleInput): Promise<EngagementRuleRow> {
    const row = await prisma.engagementRule.create({
      data: {
        name: input.name,
        trigger: input.trigger,
        delayHours: input.delayHours,
        actionType: input.actionType,
        actionPayload: input.actionPayload as Prisma.InputJsonValue,
        isActive: input.isActive,
      },
      include: { _count: { select: { fires: true } } },
    });
    return rowToShape(row);
  },

  async update(id: string, input: EngagementRuleInput): Promise<EngagementRuleRow> {
    const existing = await prisma.engagementRule.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Engagement rule not found');

    const row = await prisma.engagementRule.update({
      where: { id },
      data: {
        name: input.name,
        trigger: input.trigger,
        delayHours: input.delayHours,
        actionType: input.actionType,
        actionPayload: input.actionPayload as Prisma.InputJsonValue,
        isActive: input.isActive,
      },
      include: { _count: { select: { fires: true } } },
    });
    return rowToShape(row);
  },

  async delete(id: string): Promise<void> {
    const existing = await prisma.engagementRule.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Engagement rule not found');
    await prisma.engagementRule.delete({ where: { id } });
  },

  /**
   * Cron evaluator. Idempotent — relies on the (ruleId, targetType, targetId)
   * unique key on EngagementRuleFire to skip already-fired targets.
   */
  async runCron(): Promise<{
    rulesEvaluated: number;
    fires: number;
    errors: number;
  }> {
    const rules = await prisma.engagementRule.findMany({
      where: { isActive: true, trigger: 'CART_ABANDONED_READ_NO_PURCHASE' },
    });

    if (rules.length === 0) {
      return { rulesEvaluated: 0, fires: 0, errors: 0 };
    }

    let totalFires = 0;
    let totalErrors = 0;

    for (const rule of rules) {
      const cutoff = new Date(Date.now() - rule.delayHours * 60 * 60 * 1000);

      // Find recovery messages that were read ≥ delayHours ago. Constrained
      // by date to keep the join cheap; even a year of read events at
      // tens-per-day stays small enough to scan.
      const readEvents = await prisma.whatsAppMessageEvent.findMany({
        where: {
          status: 'read',
          eventAt: { lt: cutoff, gt: new Date(cutoff.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { messageId: true, eventAt: true },
        take: 1000,
      });
      if (readEvents.length === 0) continue;

      const messageIds = readEvents.map((e) => e.messageId);
      const eventByMessageId = new Map(readEvents.map((e) => [e.messageId, e.eventAt]));

      const candidateCarts = await prisma.cart.findMany({
        where: { lastRecoveryMessageId: { in: messageIds } },
        select: {
          id: true,
          userId: true,
          updatedAt: true,
          lastRecoveryMessageId: true,
          user: { select: { id: true, email: true, firstName: true } },
        },
      });

      for (const cart of candidateCarts) {
        try {
          // Order check — has the user placed an order since the cart was
          // last touched? If yes, the recovery worked, skip.
          const hasOrder = await prisma.order.findFirst({
            where: { userId: cart.userId, createdAt: { gte: cart.updatedAt } },
            select: { id: true },
          });
          if (hasOrder) continue;

          // Dedupe + fire atomically. If two cron runs race for the same
          // (rule, cart), the unique constraint causes a P2002 — caught and
          // treated as "already fired".
          try {
            await prisma.engagementRuleFire.create({
              data: {
                ruleId: rule.id,
                targetType: 'cart',
                targetId: cart.id,
                context: {
                  recoveryMessageId: cart.lastRecoveryMessageId,
                  readAt: eventByMessageId.get(cart.lastRecoveryMessageId!)?.toISOString(),
                  cartUpdatedAt: cart.updatedAt.toISOString(),
                },
              },
            });
          } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === 'P2002') continue; // already fired by another run
            throw err;
          }

          totalFires++;

          // Action dispatch. FLAG_FOR_MANUAL_OUTREACH is no-op beyond the
          // fire row — the fire IS the flag, surfaced via the CRM /rules
          // detail page (showing recent fires with cart + reason).
          if (rule.actionType === 'SEND_EMAIL' && resend) {
            const payload = rule.actionPayload as unknown as SendEmailPayload;
            if (cart.user?.email) {
              const personalised = payload.body.replace(
                /\{firstName\}/g,
                cart.user.firstName ?? 'there'
              );
              try {
                await resend.emails.send({
                  from: FROM_EMAIL,
                  to: cart.user.email,
                  subject: payload.subject,
                  html: `<p>${personalised}</p>`,
                });
              } catch (err) {
                logger.warn(
                  { err, ruleId: rule.id, cartId: cart.id },
                  'Engagement rule SEND_EMAIL failed (fire row already recorded)'
                );
                totalErrors++;
              }
            }
          }
        } catch (err) {
          logger.error(
            { err, ruleId: rule.id, cartId: cart.id },
            'Engagement rule evaluation failed for cart'
          );
          totalErrors++;
        }
      }
    }

    return { rulesEvaluated: rules.length, fires: totalFires, errors: totalErrors };
  },
};
