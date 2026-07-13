import { Prisma } from '@earth-revibe/db';
import { defaultExpiresAt } from './points-expiry.service';

/**
 * Cashback earn rate: 100% of the order total on a customer's first
 * (non-cancelled) order as an acquisition hook, 20% on every repeat order.
 * Centralised so every earn path — prepaid Magic Checkout capture and
 * COD-on-delivery — stays on the same rate.
 *
 * (The legacy standard-checkout path in order.service.verifyPayment earns a
 * flat 1pt/₹100 and is intentionally left on its own rate — this helper does
 * not touch it.)
 */
function cashbackPoints(total: number, isFirstOrder: boolean): number {
  return Math.floor(isFirstOrder ? total : total / 5);
}

/**
 * Award loyalty cashback for an order — idempotently.
 *
 * Points are only ever credited once real money has actually changed hands:
 *   - prepaid orders → at payment capture (finalizeOrderFromPending)
 *   - COD orders     → at delivery (the carrier collected the cash)
 *
 * Crediting COD cashback at placement — as the code used to — let a customer
 * redeem cashback on an order they had not paid for; if that order was then
 * cancelled the clawback drove their balance negative. Deferring the earn to
 * delivery removes the phantom liability at its source.
 *
 * Idempotency: an order that already carries loyaltyPointsEarned > 0 has been
 * awarded, so we no-op. This lets the DELIVERED hooks fire unconditionally
 * (a prepaid order already credited at capture is skipped) and makes duplicate
 * carrier/admin delivery events safe.
 *
 * MUST run inside a transaction so the balance increment, the order marker and
 * the ledger row commit atomically. Returns the points awarded (0 if none).
 */
export async function awardOrderPoints(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<number> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      status: true,
      totalAmount: true,
      loyaltyPointsEarned: true,
    },
  });

  if (!order || !order.userId) return 0; // guest / missing → nothing to credit
  if (order.status === 'CANCELLED') return 0; // never reward a cancelled order
  if (order.loyaltyPointsEarned > 0) return 0; // already awarded (idempotent)

  const priorOrderCount = await tx.order.count({
    where: { userId: order.userId, status: { not: 'CANCELLED' }, id: { not: order.id } },
  });
  const isFirstOrder = priorOrderCount === 0;
  const points = cashbackPoints(Number(order.totalAmount), isFirstOrder);
  if (points <= 0) return 0;

  await tx.user.update({
    where: { id: order.userId },
    data: { loyaltyPoints: { increment: points } },
  });
  await tx.order.update({
    where: { id: order.id },
    data: { loyaltyPointsEarned: points },
  });
  await tx.loyaltyTransaction.create({
    data: {
      userId: order.userId,
      type: 'EARNED',
      points,
      description: isFirstOrder
        ? `100% cashback — first order #${order.orderNumber}`
        : `20% cashback — order #${order.orderNumber}`,
      orderId: order.id,
      expiresAt: defaultExpiresAt(),
    },
  });

  return points;
}

/**
 * Reverse the loyalty side-effects of an order being cancelled or fully
 * refunded:
 *   - restore the points the customer spent on it (loyaltyPointsUsed), and
 *   - claw back the points it earned — CLAMPED so a customer's balance can
 *     never go negative. If they already redeemed the cashback we take back
 *     only what remains; taking more would push the balance below zero (the
 *     bug that produced a −1599 balance).
 *
 * The order's earned marker is zeroed after the clawback so a second
 * cancel/refund event on the same order cannot double-reverse.
 *
 * MUST run inside a transaction.
 */
export async function reverseOrderPoints(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    orderNumber: string;
    userId: string | null;
    loyaltyPointsUsed: number;
    loyaltyPointsEarned: number;
  },
  verb: 'cancelled' | 'refunded' = 'cancelled'
): Promise<void> {
  if (!order.userId) return;

  // Give back points the customer redeemed against this order.
  if (order.loyaltyPointsUsed > 0) {
    await tx.user.update({
      where: { id: order.userId },
      data: { loyaltyPoints: { increment: order.loyaltyPointsUsed } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        userId: order.userId,
        type: 'ADJUSTED',
        points: order.loyaltyPointsUsed,
        description: `Points restored from ${verb} order #${order.orderNumber}`,
        orderId: order.id,
      },
    });
  }

  // Claw back earned cashback, clamped to the current balance so we never
  // drive it negative, then zero the marker to keep the reversal idempotent.
  if (order.loyaltyPointsEarned > 0) {
    const user = await tx.user.findUnique({
      where: { id: order.userId },
      select: { loyaltyPoints: true },
    });
    const balance = Math.max(0, user?.loyaltyPoints ?? 0);
    const clawback = Math.min(order.loyaltyPointsEarned, balance);

    if (clawback > 0) {
      await tx.user.update({
        where: { id: order.userId },
        data: { loyaltyPoints: { decrement: clawback } },
      });
      await tx.loyaltyTransaction.create({
        data: {
          userId: order.userId,
          type: 'ADJUSTED',
          points: -clawback,
          description: `Points reversed from ${verb} order #${order.orderNumber}`,
          orderId: order.id,
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { loyaltyPointsEarned: 0 },
    });
  }
}
