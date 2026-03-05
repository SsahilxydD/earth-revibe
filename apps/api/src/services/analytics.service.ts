import { prisma } from "@earth-revibe/db";

export const analyticsService = {
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [
      totalRevenue,
      lastMonthRevenue,
      ordersThisMonth,
      ordersLastMonth,
      totalCustomers,
      newCustomersThisWeek,
      totalProducts,
      lowStockProducts,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { notIn: ["CANCELLED"] }, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { status: { notIn: ["CANCELLED"] }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.order.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: startOfWeek } },
      }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.productVariant.count({ where: { stock: { lte: 5 } } }),
    ]);

    const thisMonthRev = Number(totalRevenue._sum.totalAmount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.totalAmount || 0);
    const revenueChange = lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : "0";
    const ordersChange = ordersLastMonth > 0 ? (((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100).toFixed(1) : "0";

    return {
      revenue: { value: thisMonthRev, change: `${Number(revenueChange) >= 0 ? "+" : ""}${revenueChange}% from last month` },
      orders: { value: ordersThisMonth, change: `${Number(ordersChange) >= 0 ? "+" : ""}${ordersChange}% from last month` },
      customers: { value: totalCustomers, change: `+${newCustomersThisWeek} new this week` },
      products: { value: totalProducts, change: `${lowStockProducts} low stock` },
    };
  },

  async getRevenueChart() {
    const months: { month: string; revenue: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const result = await prisma.order.aggregate({
        where: { status: { notIn: ["CANCELLED"] }, createdAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      });
      months.push({
        month: start.toLocaleString("en-IN", { month: "short" }),
        revenue: Number(result._sum.totalAmount || 0),
      });
    }

    return months;
  },

  async getRecentOrders(limit: number = 5) {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return orders.map((o) => ({
      id: o.orderNumber,
      customer: `${o.user.firstName} ${o.user.lastName}`,
      total: o.totalAmount,
      status: o.status,
      date: o.createdAt.toISOString().split("T")[0],
    }));
  },

  async getAnalytics(period: string = "30d") {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      ordersByStatus,
      revenueByDay,
      topProducts,
      customerGrowth,
      avgOrderValue,
      totalTickets,
      openTickets,
    ] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.$queryRaw<{ date: string; revenue: number }[]>`
        SELECT DATE("createdAt") as date, SUM("totalAmount") as revenue
        FROM orders
        WHERE "createdAt" >= ${startDate} AND status != 'CANCELLED'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ name: string; quantity: number; revenue: number }[]>`
        SELECT p.name, SUM(oi.quantity)::int as quantity, SUM(oi."totalPrice")::numeric as revenue
        FROM order_items oi
        JOIN product_variants pv ON pv.id = oi."variantId"
        JOIN products p ON p.id = pv."productId"
        JOIN orders o ON o.id = oi."orderId"
        WHERE o."createdAt" >= ${startDate} AND o.status != 'CANCELLED'
        GROUP BY p.id, p.name
        ORDER BY quantity DESC
        LIMIT 5
      `,
      prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(*)::int as count
        FROM users
        WHERE role = 'CUSTOMER' AND "createdAt" >= ${startDate}
        GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,
      prisma.order.aggregate({
        where: { createdAt: { gte: startDate }, status: { notIn: ["CANCELLED"] } },
        _avg: { totalAmount: true },
        _count: true,
      }),
      prisma.supportTicket.count({ where: { createdAt: { gte: startDate } } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

    return {
      ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count })),
      revenueByDay: revenueByDay.map((r) => ({ date: String(r.date), revenue: Number(r.revenue) })),
      topProducts: topProducts.map((p) => ({
        name: p.name,
        quantity: Number(p.quantity),
        revenue: Number(p.revenue),
      })),
      customerGrowth: customerGrowth.map((c) => ({ month: c.month, count: Number(c.count) })),
      avgOrderValue: avgOrderValue._avg.totalAmount || 0,
      totalOrders: avgOrderValue._count,
      totalTickets,
      openTickets,
    };
  },
};
