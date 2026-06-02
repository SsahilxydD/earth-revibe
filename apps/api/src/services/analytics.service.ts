import { prisma, Prisma } from '@earth-revibe/db';
import { APP_CONSTANTS } from '../config/constants';
import { realOrders } from '../utils/order-filters';
import { computePnl } from '../utils/pnl';
import type { AnalyticsQuery } from '@earth-revibe/shared';

/**
 * Resolve the dashboard date window. Explicit startDate/endDate (ISO strings
 * from the date pickers — the client bakes local-tz day boundaries into them)
 * win; otherwise a preset (`7d/30d/90d/mtd/ytd`) is computed, defaulting to 30d.
 */
function resolveAnalyticsRange(query: AnalyticsQuery): { startDate: Date; endDate: Date } {
  const now = new Date();
  if (query.startDate || query.endDate) {
    return {
      startDate: query.startDate
        ? new Date(query.startDate)
        : new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: query.endDate ? new Date(query.endDate) : now,
    };
  }
  const endDate = now;
  let startDate: Date;
  switch (query.period) {
    case '7d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case '90d':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      break;
    case 'mtd':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case '30d':
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      break;
  }
  return { startDate, endDate };
}

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
        where: {
          ...realOrders,
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: {
          ...realOrders,
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { ...realOrders, createdAt: { gte: startOfMonth } },
      }),
      prisma.order.count({
        where: { ...realOrders, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: startOfWeek } },
      }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.productVariant.count({ where: { stock: { lte: APP_CONSTANTS.LOW_STOCK_THRESHOLD } } }),
    ]);

    const thisMonthRev = Number(totalRevenue._sum.totalAmount || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.totalAmount || 0);
    const revenueChange =
      lastMonthRev > 0 ? (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : '0';
    const ordersChange =
      ordersLastMonth > 0
        ? (((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100).toFixed(1)
        : '0';

    return {
      revenue: {
        value: thisMonthRev,
        change: `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}% from last month`,
      },
      orders: {
        value: ordersThisMonth,
        change: `${Number(ordersChange) >= 0 ? '+' : ''}${ordersChange}% from last month`,
      },
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
        where: {
          ...realOrders,
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
      });
      months.push({
        month: start.toLocaleString('en-IN', { month: 'short' }),
        revenue: Number(result._sum.totalAmount || 0),
      });
    }

    return months;
  },

  async getRecentOrders(limit: number = 5) {
    const orders = await prisma.order.findMany({
      where: realOrders,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return orders.map((o) => ({
      id: o.orderNumber,
      customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : o.guestEmail || 'Guest',
      total: o.totalAmount,
      status: o.status,
      source: o.source,
      date: o.createdAt.toISOString().split('T')[0],
    }));
  },

  async getHomeDashboard(period: string = 'today') {
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(startDate);
    } else if (period === '7d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(startDate);
    } else if (period === '90d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 90);
      prevEndDate = new Date(startDate);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      prevEndDate = new Date(startDate);
    }

    const [
      currentRevenue,
      prevRevenue,
      currentOrders,
      prevOrders,
      currentAvgOrder,
      prevAvgOrder,
      returningCustomers,
      totalOrderCustomers,
      topProducts,
      revenueByDay,
      ordersByStatus,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { ...realOrders, status: { notIn: ['CANCELLED'] }, createdAt: { gte: startDate } },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: {
          ...realOrders,
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: prevStartDate, lt: prevEndDate },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { ...realOrders, createdAt: { gte: startDate } } }),
      prisma.order.count({
        where: { ...realOrders, createdAt: { gte: prevStartDate, lt: prevEndDate } },
      }),
      prisma.order.aggregate({
        where: { ...realOrders, status: { notIn: ['CANCELLED'] }, createdAt: { gte: startDate } },
        _avg: { totalAmount: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: {
          ...realOrders,
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: prevStartDate, lt: prevEndDate },
        },
        _avg: { totalAmount: true },
      }),
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "userId")::int as count
        FROM orders
        WHERE "createdAt" >= ${startDate}
        AND "deletedAt" IS NULL
        AND status != 'DRAFT'
        AND "userId" IN (
          SELECT "userId" FROM orders
          WHERE "createdAt" < ${startDate}
          AND "deletedAt" IS NULL
          AND status != 'DRAFT'
          GROUP BY "userId"
        )
      `,
      prisma.order.findMany({
        where: { ...realOrders, createdAt: { gte: startDate } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.$queryRaw<{ name: string; quantity: number; revenue: number }[]>`
        SELECT p.name, SUM(oi.quantity)::int as quantity, SUM(oi."totalPrice")::numeric as revenue
        FROM order_items oi
        JOIN product_variants pv ON pv.id = oi."variantId"
        JOIN products p ON p.id = pv."productId"
        JOIN orders o ON o.id = oi."orderId"
        WHERE o."createdAt" >= ${startDate} AND o.status NOT IN ('CANCELLED', 'DRAFT') AND o."deletedAt" IS NULL
        GROUP BY p.id, p.name
        ORDER BY quantity DESC
        LIMIT 5
      `,
      period === 'today'
        ? Promise.resolve([])
        : prisma.$queryRaw<{ date: string; revenue: number }[]>`
            SELECT DATE("createdAt") as date, SUM("totalAmount") as revenue
            FROM orders
            WHERE "createdAt" >= ${startDate} AND status NOT IN ('CANCELLED', 'DRAFT') AND "deletedAt" IS NULL
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
          `,
      prisma.order.groupBy({
        by: ['status'],
        where: { ...realOrders, createdAt: { gte: startDate } },
        _count: true,
      }),
    ]);

    const totalSales = Number(currentRevenue._sum.totalAmount || 0);
    const prevTotalSales = Number(prevRevenue._sum.totalAmount || 0);
    const totalOrdersCount = currentOrders;
    const prevOrdersCount = prevOrders;
    const avgValue = Number(currentAvgOrder._avg.totalAmount || 0);
    const prevAvgValue = Number(prevAvgOrder._avg.totalAmount || 0);
    const returningCount = returningCustomers[0]?.count || 0;
    const totalUniqueCustomers = totalOrderCustomers.length;
    const returningRate =
      totalUniqueCustomers > 0 ? (returningCount / totalUniqueCustomers) * 100 : 0;

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      metrics: {
        totalSales: { value: totalSales, change: calcChange(totalSales, prevTotalSales) },
        totalOrders: {
          value: totalOrdersCount,
          change: calcChange(totalOrdersCount, prevOrdersCount),
        },
        avgOrderValue: { value: avgValue, change: calcChange(avgValue, prevAvgValue) },
        returningCustomerRate: { value: returningRate, change: 0 },
        conversionRate: { value: 0, change: 0 },
        onlineSessions: { value: 0, change: 0 },
      },
      topProducts: topProducts.map((p) => ({
        name: p.name,
        quantity: Number(p.quantity),
        revenue: Number(p.revenue),
      })),
      salesOverTime: revenueByDay.map((r) => ({
        date: String(r.date),
        revenue: Number(r.revenue),
      })),
      ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  },

  async getAnalytics(query: AnalyticsQuery = { channel: 'all' }) {
    const { startDate, endDate } = resolveAnalyticsRange(query);
    const channel = query.channel ?? 'all';
    const categoryId = query.categoryId;
    const range = { gte: startDate, lte: endDate };

    // P&L base set: realized = DELIVERED + non-archived, dated in range, narrowed
    // by channel (order.source) and category (orders that include an item in the
    // category). createdAt is the now-editable order/sale date.
    const sourceFilter: Prisma.OrderWhereInput =
      channel === 'online'
        ? { source: 'ONLINE' }
        : channel === 'offline'
          ? { source: 'OFFLINE' }
          : {};
    const pnlOrderWhere: Prisma.OrderWhereInput = {
      deletedAt: null,
      status: 'DELIVERED',
      createdAt: range,
      ...sourceFilter,
      ...(categoryId
        ? {
            items: {
              some: { variant: { product: { productCategories: { some: { categoryId } } } } },
            },
          }
        : {}),
    };

    const [
      ordersByStatus,
      revenueByDay,
      topProducts,
      customerGrowth,
      avgOrderValue,
      salesBySource,
      totalTickets,
      openTickets,
      pnlRevenueAgg,
      pnlItems,
      expenseAgg,
      expenseByCat,
    ] = await Promise.all([
      prisma.order.groupBy({
        by: ['status'],
        where: { ...realOrders, createdAt: range },
        _count: true,
      }),
      prisma.$queryRaw<{ date: string; revenue: number }[]>`
        SELECT DATE("createdAt") as date, SUM("totalAmount") as revenue
        FROM orders
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
          AND status NOT IN ('CANCELLED', 'DRAFT') AND "deletedAt" IS NULL
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ name: string; quantity: number; revenue: number }[]>`
        SELECT p.name, SUM(oi.quantity)::int as quantity, SUM(oi."totalPrice")::numeric as revenue
        FROM order_items oi
        JOIN product_variants pv ON pv.id = oi."variantId"
        JOIN products p ON p.id = pv."productId"
        JOIN orders o ON o.id = oi."orderId"
        WHERE o."createdAt" >= ${startDate} AND o."createdAt" <= ${endDate}
          AND o.status NOT IN ('CANCELLED', 'DRAFT') AND o."deletedAt" IS NULL
        GROUP BY p.id, p.name
        ORDER BY quantity DESC
        LIMIT 5
      `,
      prisma.$queryRaw<{ month: string; count: number }[]>`
        SELECT TO_CHAR("createdAt", 'Mon') as month, COUNT(*)::int as count
        FROM users
        WHERE role = 'CUSTOMER' AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,
      prisma.order.aggregate({
        where: { ...realOrders, createdAt: range, status: { notIn: ['CANCELLED'] } },
        _avg: { totalAmount: true },
        _count: true,
      }),
      // #5 — split sales by channel (online storefront vs offline/manual)
      prisma.order.groupBy({
        by: ['source'],
        where: { ...realOrders, createdAt: range, status: { notIn: ['CANCELLED'] } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.supportTicket.count({ where: { createdAt: range } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      // ── P&L: realized (delivered) revenue + the items behind it ──
      prisma.order.aggregate({
        where: pnlOrderWhere,
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.orderItem.findMany({
        where: {
          order: pnlOrderWhere,
          ...(categoryId
            ? { variant: { product: { productCategories: { some: { categoryId } } } } }
            : {}),
        },
        select: {
          quantity: true,
          costPrice: true,
          totalPrice: true,
          productName: true,
          order: { select: { createdAt: true } },
          // Product + category cost for the live fallback when the line has no
          // snapshotted cost.
          variant: {
            select: {
              product: {
                select: { costPrice: true, category: { select: { costPrice: true } } },
              },
            },
          },
        },
      }),
      prisma.operatingExpense.aggregate({ where: { incurredAt: range }, _sum: { amount: true } }),
      prisma.operatingExpense.groupBy({
        by: ['category'],
        where: { incurredAt: range },
        _sum: { amount: true },
      }),
    ]);

    const sourceRow = (s: 'ONLINE' | 'OFFLINE') => salesBySource.find((r) => r.source === s);
    const onlineRow = sourceRow('ONLINE');
    const offlineRow = sourceRow('OFFLINE');

    // ── Reduce the delivered order items once into COGS, coverage, bestseller,
    // and the by-day profit series ──
    let cogs = 0;
    let coveredRevenue = 0;
    let merchandiseRevenue = 0;
    let units = 0;
    const byDay = new Map<string, { revenue: number; cogs: number }>();
    const byProduct = new Map<string, { quantity: number; revenue: number }>();
    for (const it of pnlItems) {
      const qty = it.quantity;
      const lineRevenue = Number(it.totalPrice);
      // Effective unit cost: the snapshot taken at sale, else the product's own
      // cost, else its category cost (live fallback). This is what lets a
      // category cost backfill COGS for orders placed before any cost was set.
      const unitCost =
        it.costPrice ??
        it.variant?.product?.costPrice ??
        it.variant?.product?.category?.costPrice ??
        null;
      const hasCost = unitCost != null;
      const lineCost = hasCost ? Number(unitCost) * qty : 0;
      merchandiseRevenue += lineRevenue;
      units += qty;
      cogs += lineCost;
      if (hasCost) coveredRevenue += lineRevenue;
      const day = it.order.createdAt.toISOString().split('T')[0];
      const d = byDay.get(day) ?? { revenue: 0, cogs: 0 };
      d.revenue += lineRevenue;
      d.cogs += lineCost;
      byDay.set(day, d);
      const p = byProduct.get(it.productName) ?? { quantity: 0, revenue: 0 };
      p.quantity += qty;
      p.revenue += lineRevenue;
      byProduct.set(it.productName, p);
    }

    // Revenue basis: order totalAmount (money in) normally; merchandise revenue
    // when a category filter is active, so revenue and COGS stay category-scoped.
    const revenue = categoryId ? merchandiseRevenue : Number(pnlRevenueAgg._sum.totalAmount || 0);
    const expensesTotal = Number(expenseAgg._sum.amount || 0);
    const pnl = computePnl({ revenue, cogs, expensesTotal });
    const cogsCoverage = merchandiseRevenue > 0 ? coveredRevenue / merchandiseRevenue : 1;

    const bestSeller =
      [...byProduct.entries()]
        .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
        .sort((a, b) => b.quantity - a.quantity)[0] ?? null;

    const profitByDay = [...byDay.entries()]
      .map(([date, v]) => ({
        date,
        revenue: v.revenue,
        cogs: v.cogs,
        grossProfit: v.revenue - v.cogs,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const expensesByCategory = expenseByCat
      .map((e) => ({ category: e.category, amount: Number(e._sum.amount || 0) }))
      .sort((a, b) => b.amount - a.amount);

    return {
      range: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      filters: { channel, categoryId: categoryId ?? null },
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
      salesBySource: {
        online: {
          revenue: Number(onlineRow?._sum.totalAmount || 0),
          orders: onlineRow?._count || 0,
        },
        offline: {
          revenue: Number(offlineRow?._sum.totalAmount || 0),
          orders: offlineRow?._count || 0,
        },
      },
      totalTickets,
      openTickets,
      // ── Profit & Loss (delivered orders only) ──
      pnl: {
        ...pnl,
        cogsCoverage,
        orders: pnlRevenueAgg._count,
        units,
      },
      expensesByCategory,
      bestSeller,
      profitByDay,
    };
  },
};
