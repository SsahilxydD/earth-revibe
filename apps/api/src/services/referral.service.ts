import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";

export const referralService = {
  async getMyReferralCode(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw ApiError.notFound("User not found");
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
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: referrals.length,
      signedUp: referrals.filter((r: any) => r.status === "SIGNED_UP").length,
      converted: referrals.filter((r: any) => r.status === "CONVERTED").length,
      totalRewardsEarned: referrals.reduce((sum: number, r: any) => sum + (r.referrerReward || 0), 0),
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
