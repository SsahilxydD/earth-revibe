import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';

export const loyaltyService = {
  async getBalance(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    return { points: user.loyaltyPoints, value: user.loyaltyPoints };
  },

  async getHistory(userId: string, page: number = 1, limit: number = 20) {
    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
    if (!user) throw ApiError.notFound('User not found');

    const [earned, redeemed] = await Promise.all([
      prisma.loyaltyTransaction.aggregate({
        where: { userId, type: 'EARNED' },
        _sum: { points: true },
      }),
      prisma.loyaltyTransaction.aggregate({
        where: { userId, type: 'REDEEMED' },
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

  /**
   * List the user's still-usable redemption codes — minted from approved
   * LoyaltyRedemption requests. We filter to the user-scoped DiscountCodes
   * that are active, unexpired, and still within their usage budget.
   *
   * This powers the storefront /account/loyalty page so customers can view +
   * copy their codes. It's the delivery channel the WhatsApp utility template
   * points to (Meta won't deliver a message that contains the code inline).
   */
  async getActiveCodes(userId: string) {
    const now = new Date();
    const codes = await prisma.discountCode.findMany({
      where: {
        userId,
        isActive: true,
        // Redemption codes minted by approveRedemption always have an
        // expiresAt (60 days). Filter out anything already expired.
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        value: true,
        type: true,
        expiresAt: true,
        usageCount: true,
        usageLimit: true,
        createdAt: true,
      },
    });

    // Drop codes that have hit their usage limit (single-use redemption codes
    // will have usageLimit=1 and usageCount=1 once used).
    const stillUsable = codes.filter(
      (c) => c.usageLimit == null || c.usageCount < c.usageLimit
    );

    return {
      codes: stillUsable.map((c) => ({
        id: c.id,
        code: c.code,
        value: Number(c.value),
        type: c.type,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      })),
    };
  },
};
