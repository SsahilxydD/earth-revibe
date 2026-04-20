import { prisma } from '@earth-revibe/db';
import type { Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';

/**
 * Try to interpret `code` as a referral code entered at checkout and, if valid,
 * link it to this user by creating a Referral row (status=SIGNED_UP). The
 * existing post-first-order conversion logic in checkout.service.ts will then
 * credit both parties on the user's first successful purchase.
 *
 * Returns `true` when the code was a valid referral and was linked (caller
 * should treat the code as "consumed" and skip discount-code processing).
 * Returns `false` when the code is NOT a referral (caller should try it as a
 * regular discount code).
 *
 * Throws on validation failures (self-referral, already referred, etc.) so the
 * user gets clear feedback instead of a silent no-op.
 */
export async function maybeLinkReferralAtCheckout(
  userId: string,
  code: string
): Promise<boolean> {
  if (!code) return false;

  // Users carry their own invite code on `users.referralCode`.
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!referrer) return false; // Not a referral code — caller will try discount codes next.

  if (referrer.id === userId) {
    throw ApiError.badRequest("You can't use your own referral code");
  }

  // Referral rewards only pay out on the referee's first order. If they've
  // already completed an order, they're past that window.
  const completedOrderCount = await prisma.order.count({
    where: { userId, status: { not: 'CANCELLED' } },
  });
  if (completedOrderCount > 0) {
    throw ApiError.badRequest(
      'Referral codes can only be used on your first order'
    );
  }

  // One Referral row per referee (enforced by the unique constraint on
  // refereeId). If a row already exists, make sure it points to the same
  // referrer — silently treat that as success so the user can retry checkout.
  const existing = await prisma.referral.findUnique({
    where: { refereeId: userId },
    select: { id: true, referrerId: true, status: true },
  });
  if (existing) {
    if (existing.referrerId !== referrer.id) {
      throw ApiError.badRequest('You have already used a different referral code');
    }
    return true;
  }

  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: userId,
      status: 'SIGNED_UP',
    },
  });
  return true;
}

/**
 * Compute the referrer reward in points for a completed first-time referral
 * purchase. 1 point = 1 rupee, so 20% of subtotal becomes 20% of subtotal in
 * points (rounded down). Kept here so checkout.service.ts has a single source
 * of truth for the percentage.
 */
export function computeReferrerReward(subtotal: number): number {
  const pct = 0.20;
  return Math.max(0, Math.floor(subtotal * pct));
}

// Allow callers that already own a Prisma transaction to reuse the logic
// without creating a nested transaction. Currently unused externally but kept
// to match the pattern used by other services.
export async function _linkReferralInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  referrerId: string
) {
  await tx.referral.upsert({
    where: { refereeId: userId },
    create: { referrerId, refereeId: userId, status: 'SIGNED_UP' },
    update: {},
  });
}

const REFEREE_REWARD_POINTS = 50;

/**
 * Convert a pending referral for `userId` on their first successful order,
 * credit both parties, and mark the referral CONVERTED. Pure: no side effects
 * outside the supplied transaction. Idempotent: safe to re-run because it
 * re-checks `orderCount === 1` and `status === 'SIGNED_UP'` on every call.
 *
 * Returns `{ credited: false }` when the user has no pending referral or
 * isn't on their first order; callers don't need to special-case that.
 */
export async function convertReferralOnFirstOrder(
  tx: Prisma.TransactionClient,
  userId: string,
  subtotal: number,
  orderNumber: string
): Promise<
  | { credited: false }
  | { credited: true; referrerId: string; referrerReward: number; refereeReward: number }
> {
  const orderCount = await tx.order.count({
    where: { userId, status: { not: 'CANCELLED' } },
  });
  if (orderCount !== 1) return { credited: false };

  const referral = await tx.referral.findUnique({ where: { refereeId: userId } });
  if (!referral || referral.status !== 'SIGNED_UP') return { credited: false };

  const referrerReward = computeReferrerReward(subtotal);
  const refereeReward = REFEREE_REWARD_POINTS;

  await tx.referral.update({
    where: { id: referral.id },
    data: { status: 'CONVERTED', referrerReward, refereeReward },
  });

  if (referrerReward > 0) {
    await tx.user.update({
      where: { id: referral.referrerId },
      data: { loyaltyPoints: { increment: referrerReward } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        userId: referral.referrerId,
        type: 'BONUS',
        points: referrerReward,
        description: `Referral reward (20% of order #${orderNumber})`,
      },
    });
  }

  if (refereeReward > 0) {
    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: refereeReward } },
    });
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        type: 'BONUS',
        points: refereeReward,
        description: `Welcome bonus — referred signup`,
      },
    });
  }

  return {
    credited: true,
    referrerId: referral.referrerId,
    referrerReward,
    refereeReward,
  };
}

/**
 * Cheap pre-checkout check so the storefront can tell the user "Referral code
 * accepted" without committing to anything. Does not create any DB rows.
 */
export async function validateReferralCode(userId: string, code: string) {
  if (!code) return { valid: false as const, reason: 'empty' };
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, firstName: true },
  });
  if (!referrer) return { valid: false as const, reason: 'not-found' };
  if (referrer.id === userId) return { valid: false as const, reason: 'self' };

  const completedOrderCount = await prisma.order.count({
    where: { userId, status: { not: 'CANCELLED' } },
  });
  if (completedOrderCount > 0) return { valid: false as const, reason: 'not-first-order' };

  const existing = await prisma.referral.findUnique({
    where: { refereeId: userId },
    select: { referrerId: true },
  });
  if (existing && existing.referrerId !== referrer.id) {
    return { valid: false as const, reason: 'different-referrer' };
  }

  return { valid: true as const, referrerName: referrer.firstName ?? null };
}

export const referralService = {
  async getMyReferralCode(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    return { referralCode: user.referralCode };
  },

  async getMyReferrals(userId: string) {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: { firstName: true, lastName: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: referrals.length,
      signedUp: referrals.filter((r) => r.status === 'SIGNED_UP').length,
      converted: referrals.filter((r) => r.status === 'CONVERTED').length,
      totalRewardsEarned: referrals.reduce((sum, r) => sum + (r.referrerReward || 0), 0),
    };

    return { referrals, stats };
  },

  async getReferredBy(userId: string) {
    const referral = await prisma.referral.findUnique({
      where: { refereeId: userId },
      include: {
        referrer: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    return referral;
  },
};
