import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import type {
  AdminOrderQuery,
  UpdateOrderStatusInput,
  AddOrderNoteInput,
} from '@earth-revibe/shared';

/** Valid order status transitions — enforces a state machine */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURNED', 'REFUNDED'],
  CANCELLED: [],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export const adminOrderService = {
  async listOrders(query: AdminOrderQuery) {
    const { status, search, startDate, endDate, page, limit, sortBy, sortOrder } = query;
    const where: Prisma.OrderWhereInput = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: true,
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOrder(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        payment: true,
        address: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        notes: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        discountCode: { select: { code: true, type: true, value: true } },
      },
    });

    if (!order) throw ApiError.notFound('Order not found');
    return order;
  },

  async updateStatus(orderNumber: string, adminId: string, data: UpdateOrderStatusInput) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw ApiError.notFound('Order not found');

    // Enforce valid status transitions
    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(data.status)) {
      throw ApiError.badRequest(
        `Cannot transition from ${order.status} to ${data.status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: data.status },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: data.status,
        note: data.note || `Status updated to ${data.status}`,
        changedBy: adminId,
      },
    });

    return { orderNumber: order.orderNumber, status: data.status };
  },

  async addNote(orderNumber: string, adminId: string, data: AddOrderNoteInput) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw ApiError.notFound('Order not found');

    const note = await prisma.orderNote.create({
      data: {
        orderId: order.id,
        userId: adminId,
        content: data.content,
        isInternal: data.isInternal,
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return note;
  },
};
