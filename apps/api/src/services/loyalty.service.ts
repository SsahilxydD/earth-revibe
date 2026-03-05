import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";

export const loyaltyService = {
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    if (!user) throw ApiError.notFound("User not found");
    return { points: user.loyaltyPoints, value: user.loyaltyPoints };
  },

  async getHistory(userId: string, page: number = 1, limit: number = 20) {
    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.loyaltyTransaction.count({ where: { userId } }),
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getSummary(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    if (!user) throw ApiError.notFound("User not found");

    const [earned, redeemed] = await Promise.all([
      prisma.loyaltyTransaction.aggregate({
        where: { userId, type: "EARNED" },
        _sum: { points: true },
      }),
      prisma.loyaltyTransaction.aggregate({
        where: { userId, type: "REDEEMED" },
        _sum: { points: true },
      }),
    ]);

    return {
      currentBalance: user.loyaltyPoints,
      totalEarned: earned._sum.points || 0,
      totalRedeemed: Math.abs(redeemed._sum.points || 0),
      pointValue: 1,
    };
  },
};
