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

    const totalSpentValue = Number(totalSpent._sum.totalAmount) || 0;
    const orderCount = customer._count?.orders || 0;
    const avgOrderValue = orderCount > 0 ? totalSpentValue / orderCount : 0;

    // Determine customer segment
    let segment: "VIP" | "Regular" | "New" | "At Risk" = "New";
    if (totalSpentValue >= 10000) {
      segment = "VIP";
    } else if (totalSpentValue >= 2000) {
      segment = "Regular";
    } else if (orderCount <= 1) {
      segment = "New";
    }

    // Check for "At Risk": had previous orders but none in the last 90 days
    if (orderCount > 0) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const recentOrderCount = await prisma.order.count({
        where: { userId: id, createdAt: { gte: ninetyDaysAgo } },
      } as any);
      if (recentOrderCount === 0) {
        segment = "At Risk";
      }
    }

    return {
      ...customer,
      totalSpent: totalSpentValue,
      avgOrderValue,
      segment,
    };
  },

  async exportCustomersCSV() {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" } as any,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        loyaltyPoints: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    // Fetch total spent for each customer
    const rows: string[] = [];
    rows.push("Name,Email,Phone,Orders,Total Spent,Loyalty Points,Status,Joined Date");

    for (const customer of customers) {
      const totalSpent = await prisma.order.aggregate({
        where: {
          userId: customer.id,
          status: { notIn: ["CANCELLED", "REFUNDED"] },
        },
        _sum: { totalAmount: true },
      });

      const name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
      const phone = customer.phone || "";
      const orders = customer._count?.orders || 0;
      const spent = Number(totalSpent._sum.totalAmount) || 0;
      const loyalty = customer.loyaltyPoints || 0;
      const status = customer.isActive ? "Active" : "Inactive";
      const joined = new Date(customer.createdAt).toISOString().split("T")[0];

      // Escape CSV fields that may contain commas or quotes
      const escapeCsv = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      rows.push(
        [
          escapeCsv(name),
          escapeCsv(customer.email),
          escapeCsv(phone),
          orders,
          spent.toFixed(2),
          loyalty,
          status,
          joined,
        ].join(",")
      );
    }

    return rows.join("\n");
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
