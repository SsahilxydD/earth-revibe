import { prisma, Prisma } from '@earth-revibe/db';
import { logger } from '../config/logger';

export const POINT_EXPIRY_DAYS = 180;

export function defaultExpiresAt(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + POINT_EXPIRY_DAYS);
  return d;
}

/**
 * Find all EARNED/BONUS loyalty_transactions whose `expiresAt` has passed and
 * that haven't already been expired (`expiredAt IS NULL`). For each, deduct
 * the points from the user's balance and insert a matching EXPIRED txn row
 * so the audit trail stays balanced.
 *
 * Runs in small per-user transactions so one bad row can't poison the sweep.
 * Returns a summary the cron job can log + reply with.
 */
export async function expireOldPoints(now: Date = new Date()) {
  const toExpire = await prisma.loyaltyTransaction.findMany({
    where: {
      type: { in: ['EARNED', 'BONUS'] },
      expiresAt: { lte: now, not: null },
      expiredAt: null,
      // Only expire positive rows — defensive; the schema allows signed points.
      points: { gt: 0 },
    },
    orderBy: { expiresAt: 'asc' },
    take: 500, // bounded per run so the cron can't chew forever
    select: { id: true, userId: true, points: true, description: true, expiresAt: true },
  });

  let expiredUsers = 0;
  let expiredPoints = 0;
  let expiredRows = 0;
  const errors: Array<{ id: string; err: string }> = [];

  for (const row of toExpire) {
    try {
      await prisma.$transaction(
        async (tx) => {
          // Cap the decrement at the user's current balance so we never go
          // negative (user may have already redeemed these points).
          const user = await tx.user.findUnique({
            where: { id: row.userId },
            select: { loyaltyPoints: true },
          });
          if (!user) return; // shouldn't happen; skip
          const pointsToRemove = Math.min(row.points, user.loyaltyPoints);

          if (pointsToRemove > 0) {
            await tx.user.update({
              where: { id: row.userId },
              data: { loyaltyPoints: { decrement: pointsToRemove } },
            });
            await tx.loyaltyTransaction.create({
              data: {
                userId: row.userId,
                type: 'EXPIRED',
                points: -pointsToRemove,
                description: `Expired from ${row.description}`,
              },
            });
          }
          await tx.loyaltyTransaction.update({
            where: { id: row.id },
            data: { expiredAt: now },
          });

          if (pointsToRemove > 0) {
            expiredUsers += 1;
            expiredPoints += pointsToRemove;
          }
          expiredRows += 1;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err: any) {
      errors.push({ id: row.id, err: err?.message ?? String(err) });
      logger.error({ err, txnId: row.id }, 'Failed to expire loyalty transaction');
    }
  }

  return {
    scanned: toExpire.length,
    expiredRows,
    expiredUsers,
    expiredPoints,
    errors: errors.length,
  };
}
