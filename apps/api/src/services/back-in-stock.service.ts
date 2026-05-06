import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { logger } from '../config/logger';
import { sendWhatsAppBackInStock } from './whatsapp.service';

// Back-in-stock subscriptions (PR 10). When a variant's stock transitions
// 0 → >0, this service notifies every subscribed user via WhatsApp.
// 1:1 transactional sends, opt-in only — Meta utility category, clear of
// the broadcast fair-use guard rail.

export const backInStockService = {
  /**
   * Subscribe the user to be notified when this variant comes back in stock.
   * Idempotent — re-subscribing after a previous notification clears
   * `notifiedAt` so the user is queued for the next restock cycle.
   * Throws if the variant doesn't exist or is currently in stock (no point
   * subscribing to something that's already available).
   */
  async subscribe(userId: string, variantId: string): Promise<{ subscribed: boolean }> {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, stock: true, isActive: true },
    });
    if (!variant || !variant.isActive) {
      throw ApiError.notFound('Variant not found');
    }
    if (variant.stock > 0) {
      throw ApiError.badRequest('Variant is currently in stock — no need to subscribe');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });
    if (!user) throw ApiError.unauthorized('User not found');
    if (!user.phone) {
      throw ApiError.badRequest(
        'Phone number required for WhatsApp back-in-stock alerts. Add a phone number to your account first.'
      );
    }

    await prisma.backInStockSubscription.upsert({
      where: { userId_variantId: { userId, variantId } },
      create: { userId, variantId },
      update: { notifiedAt: null }, // re-subscribe queues for next cycle
    });

    return { subscribed: true };
  },

  /**
   * Called by product-variant updates whenever stock changes. If the
   * transition was 0 → >0, fire WhatsApp alerts to every subscribed user
   * who hasn't already been notified for this variant.
   *
   * Best-effort batch send: per-user failures are logged but don't abort
   * the loop. notifiedAt is set after the send attempt regardless of
   * success — this prevents flapping (stock 0 → 1 → 0 → 1 → ...) from
   * spamming users.
   */
  async processStockTransition(
    variantId: string,
    oldStock: number,
    newStock: number
  ): Promise<{ notified: number; failed: number; skipped: number }> {
    if (oldStock > 0 || newStock <= 0) {
      // Not a 0 → >0 transition; nothing to do.
      return { notified: 0, failed: 0, skipped: 0 };
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        size: true,
        color: true,
        product: { select: { name: true, slug: true } },
      },
    });
    if (!variant) return { notified: 0, failed: 0, skipped: 0 };

    const subs = await prisma.backInStockSubscription.findMany({
      where: { variantId, notifiedAt: null },
      include: {
        user: { select: { id: true, firstName: true, phone: true, isActive: true } },
      },
    });

    if (subs.length === 0) return { notified: 0, failed: 0, skipped: 0 };

    let notified = 0;
    let failed = 0;
    let skipped = 0;

    const productLabel =
      variant.color && variant.size
        ? `${variant.product.name} — ${variant.color} / ${variant.size}`
        : variant.product.name;

    for (const sub of subs) {
      if (!sub.user.isActive || !sub.user.phone) {
        skipped++;
        await prisma.backInStockSubscription
          .update({
            where: { id: sub.id },
            data: { notifiedAt: new Date() },
          })
          .catch(() => {});
        continue;
      }

      const result = await sendWhatsAppBackInStock(
        sub.user.phone,
        sub.user.firstName,
        productLabel
      );

      if (result.ok) notified++;
      else failed++;

      // Mark notifiedAt regardless to avoid re-notifying on the same
      // restock cycle. If the user re-subscribes (clicks "Notify me"
      // again after a missed alert), notifiedAt resets to null and they
      // get the next transition.
      await prisma.backInStockSubscription
        .update({
          where: { id: sub.id },
          data: { notifiedAt: new Date() },
        })
        .catch((err) => {
          logger.warn(
            { err, subscriptionId: sub.id },
            'Failed to update notifiedAt on subscription'
          );
        });
    }

    logger.info(
      {
        variantId,
        productSlug: variant.product.slug,
        notified,
        failed,
        skipped,
        total: subs.length,
      },
      'Back-in-stock notifications dispatched'
    );

    return { notified, failed, skipped };
  },
};
