import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";

interface CustomerQuery {
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

export const adminCustomerService = {
  async listCustomers(query: CustomerQuery) {
    const { search, isActive, page, limit, sortBy, sortOrder } = query;
    const where: Record<string, unknown> = { role: "CUSTOMER" };

    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          loyaltyPoints: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return { customers, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getCustomer(id: string) {
    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        loyaltyPoints: true,
        createdAt: true,
        lastLoginAt: true,
        addresses: true,
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
            payment: { select: { status: true, paidAt: true } },
          },
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!customer) throw ApiError.notFound("Customer not found");

    const totalSpent = await prisma.order.aggregate({
      where: { userId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { totalAmount: true },
    });

    return { ...customer, totalSpent: totalSpent._sum.totalAmount || 0 };
  },

  async toggleActive(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound("Customer not found");

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });

    return updated;
  },
};
