import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { APP_CONSTANTS } from '../config/constants';

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

    // Whitelist sortBy to prevent arbitrary field sorting
    const allowedSortFields = ['createdAt', 'email', 'firstName', 'lastName', 'loyaltyPoints'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const where: Prisma.UserWhereInput = { role: 'CUSTOMER' };

    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          // Picker UIs (manual order creation) skip the OTP step when the
          // selected customer is already verified — surfacing this flag
          // here saves a second round-trip.
          phoneVerified: true,
          isActive: true,
          loyaltyPoints: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
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
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            payment: { select: { status: true, paidAt: true } },
          },
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!customer) throw ApiError.notFound('Customer not found');

    const totalSpent = await prisma.order.aggregate({
      where: { userId: id, status: { notIn: ['CANCELLED', 'RETURNED'] } },
      _sum: { totalAmount: true },
    });

    const totalSpentValue = Number(totalSpent._sum.totalAmount) || 0;
    const orderCount = customer._count?.orders || 0;
    const avgOrderValue = orderCount > 0 ? totalSpentValue / orderCount : 0;

    // Determine customer segment
    let segment: 'VIP' | 'Regular' | 'New' | 'At Risk' = 'New';
    if (totalSpentValue >= 10000) {
      segment = 'VIP';
    } else if (totalSpentValue >= 2000) {
      segment = 'Regular';
    } else if (orderCount <= 1) {
      segment = 'New';
    }

    // Check for "At Risk": had previous orders but none in the last 90 days
    if (orderCount > 0) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const recentOrderCount = await prisma.order.count({
        where: { userId: id, createdAt: { gte: ninetyDaysAgo } },
      });
      if (recentOrderCount === 0) {
        segment = 'At Risk';
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
    // Single query: fetch customers with order count and total spent using groupBy
    // This avoids N+1 queries (previously one aggregate query per customer)
    const totalCount = await prisma.user.count({ where: { role: 'CUSTOMER' } });
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
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
      take: APP_CONSTANTS.MAX_CSV_EXPORT_ROWS,
    });
    const truncated = totalCount > APP_CONSTANTS.MAX_CSV_EXPORT_ROWS;

    // Batch fetch total spent for all customers in one query
    const spentByUser = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: customers.map((c) => c.id) },
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      _sum: { totalAmount: true },
    });

    const spentMap = new Map(
      spentByUser.map((row) => [row.userId, Number(row._sum.totalAmount) || 0])
    );

    const escapeCsv = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows: string[] = [];
    rows.push('Name,Email,Phone,Orders,Total Spent,Loyalty Points,Status,Joined Date');

    for (const customer of customers) {
      const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      const phone = customer.phone || '';
      const orders = customer._count?.orders || 0;
      const spent = spentMap.get(customer.id) || 0;
      const loyalty = customer.loyaltyPoints || 0;
      const status = customer.isActive ? 'Active' : 'Inactive';
      const joined = new Date(customer.createdAt).toISOString().split('T')[0];

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
        ].join(',')
      );
    }

    const csv = rows.join('\n');
    return { csv, truncated, totalCount, exportedCount: customers.length };
  },

  async toggleActive(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound('Customer not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });

    return updated;
  },
};
