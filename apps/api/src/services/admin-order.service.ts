import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { AdminOrderQuery, UpdateOrderStatusInput, AddOrderNoteInput } from "@earth-revibe/shared";

export const adminOrderService = {
  async listOrders(query: AdminOrderQuery) {
    const { status, search, startDate, endDate, page, limit, sortBy, sortOrder } = query;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as any).gte = new Date(startDate);
      if (endDate) (where.createdAt as any).lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: true,
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      }),
      prisma.order.count({ where: where as any }),
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
        statusHistory: { orderBy: { createdAt: "desc" } },
        notes: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
        },
        discountCode: { select: { code: true, type: true, value: true } },
      },
    });

    if (!order) throw ApiError.notFound("Order not found");
    return order;
  },

  async updateStatus(orderNumber: string, adminId: string, data: UpdateOrderStatusInput) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw ApiError.notFound("Order not found");

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
    if (!order) throw ApiError.notFound("Order not found");

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
