import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { logger } from '../config/logger';
import { sendWhatsAppDropAlert, type DropAlertCard } from './whatsapp.service';

// New-drop alert dispatcher (PR 10b). MARKETING category — gates every send
// against opt-in, frequency cap, and daily marketing budget. The send helper
// itself enforces none of these; this service is the only entry point.
//
// See docs/plans/2026-05-06-new-drop-alerts-design.md for the full design.

const FREQUENCY_CAP_DAYS = 7;
const TEMPLATE_KEY = 'NEW_DROP_ALERT';
const VARIANT_KEY_DEFAULT = 'v1';

/// Asia/Kolkata calendar day for marketing budget bucketing. Hardcoded
/// because the cap is a per-Meta-tier daily quota and Meta's day boundary
/// is per their tier's region — for India, IST is the right anchor.
function todayKolkata(): string {
  const now = new Date();
  // Add 5h30m to UTC to land in Kolkata time, then take YYYY-MM-DD.
  const kolkata = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return kolkata.toISOString().slice(0, 10);
}

async function getOrCreateBudget() {
  const day = todayKolkata();
  return prisma.marketingSendBudget.upsert({
    where: { day },
    create: { day },
    update: {},
  });
}

export const dropAlertService = {
  /**
   * Customer opt-in. Idempotent — if a row exists, restore it (clear
   * unsubscribedAt) so re-toggling the storefront switch works as expected.
   * Rotates the unsubscribe token on each opt-in to invalidate any old links.
   */
  async subscribe(userId: string): Promise<{ subscribed: boolean }> {
    // Check user has a phone (mandatory for WhatsApp delivery).
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });
    if (!user) throw ApiError.unauthorized('User not found');
    if (!user.phone) {
      throw ApiError.badRequest(
        'Phone number required for drop alerts. Add a phone number to your account first.'
      );
    }

    await prisma.dropSubscription.upsert({
      where: { userId },
      create: { userId },
      update: {
        unsubscribedAt: null,
        optInAt: new Date(),
        // Re-rotate the token on every opt-in so old unsubscribe links die.
        // Prisma uses the schema's @default(cuid()) on insert; we mirror that
        // semantic on update by writing a new cuid via the cuid generator.
        // Simpler: trigger update with no token change, then refresh in a
        // separate call — but that's two writes. Use raw concat of timestamp
        // for v1 (collision-safe enough for this use).
        unsubToken: `${userId}_${Date.now()}`,
      },
    });

    return { subscribed: true };
  },

  /**
   * Customer-initiated unsubscribe (storefront toggle off).
   */
  async unsubscribeByUserId(userId: string): Promise<{ unsubscribed: boolean }> {
    const sub = await prisma.dropSubscription.findUnique({ where: { userId } });
    if (!sub) return { unsubscribed: true }; // never subscribed = effectively unsubscribed
    await prisma.dropSubscription.update({
      where: { userId },
      data: { unsubscribedAt: new Date() },
    });
    return { unsubscribed: true };
  },

  /**
   * Token-based unsubscribe (the WhatsApp message's "Stop these alerts"
   * button → /u/<token>). No auth required — the token is single-purpose.
   */
  async unsubscribeByToken(token: string): Promise<{ unsubscribed: boolean }> {
    const sub = await prisma.dropSubscription.findUnique({
      where: { unsubToken: token },
    });
    if (!sub) {
      // Token not recognised — could be expired (rotated by re-opt-in) or
      // never existed. Either way, idempotent success from the user's POV.
      return { unsubscribed: true };
    }
    if (sub.unsubscribedAt) {
      // Already unsubscribed — nothing to do.
      return { unsubscribed: true };
    }
    await prisma.dropSubscription.update({
      where: { id: sub.id },
      data: { unsubscribedAt: new Date() },
    });
    logger.info({ userId: sub.userId }, 'Drop subscription unsubscribed via token link');
    return { unsubscribed: true };
  },

  /**
   * Webhook-side unsubscribe — called from the WhatsApp inbound webhook
   * when a subscriber replies with text matching /^stop$/i.
   */
  async unsubscribeByPhone(phoneDigits: string): Promise<void> {
    if (!phoneDigits) return;
    // Match the same suffix-strategy used elsewhere for waId ↔ User.phone.
    const last10 = phoneDigits.slice(-10);
    const user = await prisma.user
      .findFirst({
        where: { phone: { endsWith: last10 } },
        select: { id: true },
      })
      .catch(() => null);
    if (!user) return;
    const sub = await prisma.dropSubscription.findUnique({ where: { userId: user.id } });
    if (!sub || sub.unsubscribedAt) return;
    await prisma.dropSubscription.update({
      where: { userId: user.id },
      data: { unsubscribedAt: new Date() },
    });
    logger.info({ userId: user.id }, 'Drop subscription unsubscribed via STOP reply');
  },

  /**
   * Status query for the storefront toggle.
   */
  async getStatus(userId: string): Promise<{
    subscribed: boolean;
    optInAt: string | null;
    lastNotifiedAt: string | null;
  }> {
    const sub = await prisma.dropSubscription.findUnique({ where: { userId } });
    if (!sub) return { subscribed: false, optInAt: null, lastNotifiedAt: null };
    return {
      subscribed: !sub.unsubscribedAt,
      optInAt: sub.unsubscribedAt ? null : sub.optInAt.toISOString(),
      lastNotifiedAt: sub.lastNotifiedAt?.toISOString() ?? null,
    };
  },

  /**
   * Dry-run for the admin "Send drop alert" button. Returns counts so the
   * UI can display "this will send to N users (M budget remaining)" before
   * the operator confirms.
   */
  async dryRun(_productId: string): Promise<{
    eligibleCount: number;
    budgetRemaining: number;
    willSendCount: number;
  }> {
    // productId is reserved for future per-product targeting (e.g. only
    // alert customers who've shown interest in this category). v1 ignores it.
    const cutoff = new Date(Date.now() - FREQUENCY_CAP_DAYS * 24 * 60 * 60 * 1000);
    const eligibleCount = await prisma.dropSubscription.count({
      where: {
        unsubscribedAt: null,
        OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: cutoff } }],
        user: { isActive: true, phone: { not: null } },
      },
    });
    const budget = await getOrCreateBudget();
    const remaining = Math.max(0, budget.cap - budget.sentCount);
    return {
      eligibleCount,
      budgetRemaining: remaining,
      willSendCount: Math.min(eligibleCount, remaining),
    };
  },

  /**
   * Admin-triggered dispatch. Caller validates admin auth at the route
   * layer; this method assumes the call is authorised.
   *
   * Best-effort batch send: per-user failures log and keep going. The
   * frequency-cap update happens on EVERY send attempt, success or fail —
   * prevents a flapping Meta API from double-billing the cap. Same pattern
   * as PR 10's back-in-stock dispatcher.
   */
  async dispatch(args: {
    productId: string;
    dropName: string;
    cards: DropAlertCard[];
  }): Promise<{ notified: number; failed: number; skippedBudget: number }> {
    if (args.cards.length !== 3) {
      throw ApiError.badRequest('Drop alert requires exactly 3 cards (v1 template constraint)');
    }

    const cutoff = new Date(Date.now() - FREQUENCY_CAP_DAYS * 24 * 60 * 60 * 1000);
    const eligible = await prisma.dropSubscription.findMany({
      where: {
        unsubscribedAt: null,
        OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: cutoff } }],
        user: { isActive: true, phone: { not: null } },
      },
      include: {
        user: { select: { id: true, firstName: true, phone: true } },
      },
    });

    const budget = await getOrCreateBudget();
    let remaining = budget.cap - budget.sentCount;
    if (remaining <= 0) {
      logger.warn(
        {
          productId: args.productId,
          day: budget.day,
          sentCount: budget.sentCount,
          cap: budget.cap,
        },
        'Drop alert dispatch aborted — daily marketing budget exhausted'
      );
      return { notified: 0, failed: 0, skippedBudget: eligible.length };
    }

    const slice = eligible.slice(0, remaining);
    const skippedBudget = eligible.length - slice.length;

    let notified = 0;
    let failed = 0;

    for (const sub of slice) {
      if (!sub.user.phone) {
        // Defensive — should be filtered already.
        continue;
      }
      const result = await sendWhatsAppDropAlert({
        phone: sub.user.phone,
        firstName: sub.user.firstName,
        dropName: args.dropName,
        cards: args.cards,
        unsubscribeToken: sub.unsubToken,
      });

      if (result.ok) notified++;
      else failed++;

      // Update lastNotifiedAt + budget regardless of send success — flap
      // protection. Failures are still "we tried" from a frequency-cap POV.
      await prisma.dropSubscription
        .update({
          where: { id: sub.id },
          data: { lastNotifiedAt: new Date() },
        })
        .catch((err) =>
          logger.warn({ err, subscriptionId: sub.id }, 'Failed to update lastNotifiedAt')
        );

      await prisma.marketingSendBudget
        .update({
          where: { day: budget.day },
          data: { sentCount: { increment: 1 } },
        })
        .catch((err) =>
          logger.warn({ err, day: budget.day }, 'Failed to increment marketing budget')
        );
      remaining--;

      if (result.ok && result.messageId) {
        await prisma.dropAlertSend
          .create({
            data: {
              userId: sub.userId,
              productId: args.productId,
              templateKey: TEMPLATE_KEY,
              variantKey: VARIANT_KEY_DEFAULT,
              messageId: result.messageId,
            },
          })
          .catch((err) =>
            logger.warn(
              { err, userId: sub.userId, messageId: result.messageId },
              'Failed to log drop alert send'
            )
          );
      }
    }

    logger.info(
      {
        productId: args.productId,
        dropName: args.dropName,
        notified,
        failed,
        skippedBudget,
        eligible: eligible.length,
      },
      'Drop alert dispatch complete'
    );
    return { notified, failed, skippedBudget };
  },
};
