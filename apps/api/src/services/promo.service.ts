import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';

/**
 * Public, unauthenticated lookup so the /spinner landing can show what's on
 * offer before the visitor logs in. Returns only display-safe fields — never
 * claimCount / maxClaims (those are internal acquisition metrics).
 */
export async function getPublicCampaign(code: string) {
  const campaign = await prisma.promoCampaign.findUnique({
    where: { code },
    select: { code: true, title: true, pointsReward: true, isActive: true },
  });
  if (!campaign || !campaign.isActive) {
    throw ApiError.notFound('This offer is not available');
  }
  return campaign;
}

/**
 * Grant a logged-in user the campaign's point bonus, exactly once.
 *
 * Atomic + idempotent: runs in a Serializable transaction and the
 * `@@unique([campaignId, userId])` on PromoClaim is the hard backstop — a
 * double-tap or a refresh either returns the existing claim (`alreadyClaimed`)
 * or loses the serialization race and is caught as a duplicate. Points are
 * credited as a BONUS LoyaltyTransaction with `expiresAt = now + expiryDays`,
 * so the existing expire-points cron sweeps them at the 6-month mark.
 */
export async function claimPromo(userId: string, code: string) {
  return prisma
    .$transaction(
      async (tx) => {
        const campaign = await tx.promoCampaign.findUnique({ where: { code } });
        if (!campaign || !campaign.isActive) {
          throw ApiError.notFound('This offer is not available');
        }

        // Already claimed by this user — return the prior result, don't re-credit.
        const existing = await tx.promoClaim.findUnique({
          where: { campaignId_userId: { campaignId: campaign.id, userId } },
        });
        if (existing) {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { loyaltyPoints: true },
          });
          return {
            alreadyClaimed: true as const,
            pointsAwarded: existing.pointsAwarded,
            newBalance: user?.loyaltyPoints ?? 0,
          };
        }

        // Optional global cap on total claims.
        if (campaign.maxClaims != null && campaign.claimCount >= campaign.maxClaims) {
          throw ApiError.badRequest('This offer has ended');
        }

        const expiresAt = new Date(Date.now() + campaign.expiryDays * 24 * 60 * 60 * 1000);

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: campaign.pointsReward } },
          select: { loyaltyPoints: true },
        });

        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'BONUS',
            points: campaign.pointsReward,
            description: campaign.title,
            expiresAt,
          },
        });

        await tx.promoClaim.create({
          data: { campaignId: campaign.id, userId, pointsAwarded: campaign.pointsReward },
        });

        await tx.promoCampaign.update({
          where: { id: campaign.id },
          data: { claimCount: { increment: 1 } },
        });

        return {
          alreadyClaimed: false as const,
          pointsAwarded: campaign.pointsReward,
          newBalance: updatedUser.loyaltyPoints,
          expiresAt,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
    .catch((err) => {
      // Lost the race to a concurrent claim (unique violation). Treat as
      // already-claimed rather than erroring — the user still got their points.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return prisma.user
          .findUnique({ where: { id: userId }, select: { loyaltyPoints: true } })
          .then((u) => ({
            alreadyClaimed: true as const,
            pointsAwarded: 0,
            newBalance: u?.loyaltyPoints ?? 0,
          }));
      }
      throw err;
    });
}
