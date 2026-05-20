import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { sendWhatsAppOrderUpdate } from './whatsapp.service';
import { logger } from '../config/logger';
import { isCarrierOwnedStatus } from './shiprocket.service';
import { generateOrderNumber } from '@earth-revibe/shared';
import type {
  AdminOrderQuery,
  UpdateOrderStatusInput,
  AddOrderNoteInput,
  CreateManualOrderInput,
  ArchiveOrderInput,
} from '@earth-revibe/shared';

/**
 * Six-status state machine.
 *
 * - PENDING / CONFIRMED → CANCELLED is the pre-pickup customer/admin cancel path.
 * - CONFIRMED → SHIPPING is normally carrier-driven (via shiprocketService.syncTrackingState).
 *   Admin manual override is only allowed when there's no AWB (no carrier source-of-truth yet).
 * - SHIPPING → DELIVERED / RETURNED are carrier-driven.
 * - DELIVERED → RETURNED is admin-approved on a customer return request.
 * - CANCELLED and RETURNED are terminal here; refund accounting lives on Payment.status.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED', 'RETURNED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export const adminOrderService = {
  async listOrders(query: AdminOrderQuery) {
    const { status, source, view, search, startDate, endDate, page, limit, sortBy, sortOrder } =
      query;
    const where: Prisma.OrderWhereInput = {};

    // Soft-delete view: 'active' hides archived (default), 'archived' shows
    // only archived, 'all' shows everything.
    if (view === 'active') where.deletedAt = null;
    else if (view === 'archived') where.deletedAt = { not: null };

    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { address: { fullName: { contains: search, mode: 'insensitive' } } },
        { address: { phone: { contains: search, mode: 'insensitive' } } },
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
          address: { select: { fullName: true, phone: true } },
          items: true,
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOrder(orderNumber: string) {
    // Note: NOT filtered by deletedAt — the detail page must be able to open
    // an archived order to view it and restore it.
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
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { phone: true, firstName: true } },
        address: { select: { phone: true, fullName: true } },
      },
    });
    if (!order) throw ApiError.notFound('Order not found');

    // Enforce valid status transitions
    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(data.status)) {
      throw ApiError.badRequest(
        `Cannot transition from ${order.status} to ${data.status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    // Carrier-owned-status lock: once an AWB is assigned, Shiprocket drives
    // SHIPPED/OUT_FOR_DELIVERY/DELIVERED. Admin manual writes to those values
    // would race the next /refresh-shipment-status sweep and either silently
    // get overwritten or fight the source-of-truth contract. CANCELLED is
    // intentionally still allowed (admin can cancel pre-pickup) and
    // RETURNED/REFUNDED handle post-delivery flows.
    if (order.awbCode && isCarrierOwnedStatus(data.status)) {
      throw ApiError.badRequest(
        `Order has an AWB (${order.awbCode}) — ${data.status} is owned by Shiprocket. ` +
          `Wait for the next status sweep (≤10 min) or trigger /refresh-shipment-status manually.`
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

    // Fire-and-forget WhatsApp notification to customer (registered or guest)
    const phone = order.user?.phone || order.address?.phone;
    const name = order.user?.firstName || order.address?.fullName?.split(' ')[0] || '';
    if (phone) {
      sendWhatsAppOrderUpdate(phone, name, order.orderNumber, data.status).catch((err) => {
        logger.error({ err, orderNumber }, 'Failed to send WhatsApp order update');
      });
    }

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

  /**
   * Create a manual order for an offline / in-person sale.
   * - source = OFFLINE, no Razorpay Payment row is created.
   * - Stock is decremented atomically (same race-safe pattern as checkout).
   * - A throwaway Address row is created from the customer details because
   *   Order.addressId is required by the schema.
   * - The offline payment method (cash/UPI/etc.) is recorded as an internal note.
   */
  async createManualOrder(adminId: string, data: CreateManualOrderInput) {
    const variantIds = [...new Set(data.items.map((i) => i.variantId))];
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Read variants INSIDE the transaction so prices + names reflect
        // what's in the DB at commit time — not a snapshot from before the
        // txn started. Under Serializable isolation, any concurrent write
        // to one of these rows will roll us back.
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        });
        const variantMap = new Map(variants.map((v) => [v.id, v]));

        let subtotal = 0;
        const orderItems = data.items.map((item) => {
          const v = variantMap.get(item.variantId);
          if (!v) throw ApiError.badRequest(`Product variant ${item.variantId} not found`);
          const unitPrice = item.unitPrice ?? (Number(v.price) || Number(v.product.price));
          const totalPrice = unitPrice * item.quantity;
          subtotal += totalPrice;
          return {
            variantId: v.id,
            quantity: item.quantity,
            unitPrice,
            totalPrice,
            productName: v.product.name,
            productImage: v.product.images[0]?.url || null,
            variantSize: v.size,
            variantColor: v.color,
          };
        });

        const discountAmount = data.discountAmount || 0;
        const shippingAmount = data.shippingAmount || 0;
        const taxAmount = data.taxAmount || 0;

        // Refuse impossible discounts so the audit trail doesn't store a
        // bigger discount than the items themselves. `Math.max(...,0)` on
        // totalAmount would silently mask this otherwise.
        if (discountAmount > subtotal) {
          throw ApiError.badRequest(
            `Discount (₹${discountAmount}) exceeds subtotal (₹${subtotal})`
          );
        }

        const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

        // Reserve stock by decrementing with a race-safe predicate.
        for (const item of data.items) {
          const result = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            const v = variantMap.get(item.variantId);
            throw ApiError.conflict(`Insufficient stock for ${v?.product.name ?? item.variantId}`);
          }
        }

        // Order.addressId is required → create an address from offline details.
        const address = await tx.address.create({
          data: {
            label: 'Offline',
            fullName: data.customerName,
            phone: data.customerPhone,
            line1: 'Offline / in-person sale',
            city: '-',
            state: '-',
            pinCode: '000000',
          },
        });

        const created = await tx.order.create({
          data: {
            orderNumber,
            guestEmail: data.customerEmail || null,
            addressId: address.id,
            source: 'OFFLINE',
            status: data.status,
            subtotal,
            discountAmount,
            shippingAmount,
            taxAmount,
            totalAmount,
            items: { create: orderItems },
            statusHistory: {
              create: {
                status: data.status,
                note: 'Manual offline order created',
                changedBy: adminId,
              },
            },
          },
          include: { items: true },
        });

        const noteParts: string[] = [];
        if (data.paymentMethod) noteParts.push(`Offline payment method: ${data.paymentMethod}`);
        if (data.note) noteParts.push(data.note);
        if (noteParts.length > 0) {
          await tx.orderNote.create({
            data: {
              orderId: created.id,
              userId: adminId,
              content: noteParts.join('\n'),
              isInternal: true,
            },
          });
        }

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return order;
  },

  /**
   * Soft-delete (archive) an order. Data is retained and restorable; the
   * order is hidden from lists/history/analytics. Distinct from CANCELLED
   * (which is an order-status with refund/restock side-effects).
   */
  async archiveOrder(orderNumber: string, adminId: string, data: ArchiveOrderInput) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.deletedAt) throw ApiError.badRequest('Order is already archived');

    // Active carrier-tracked shipments must not be archived — the package is
    // still in flight and we still need to receive Shiprocket status updates
    // into THIS row. Archive after delivery / cancel first if the customer
    // is refusing it. (Offline-source SHIPPING orders have no AWB, so the
    // gate is awbCode + status together, not status alone.)
    if (order.status === 'SHIPPING' && order.awbCode) {
      throw ApiError.badRequest(
        `Cannot archive order with active AWB (${order.awbCode}) — wait for delivery ` +
          `or cancel via PUT /:orderNumber/status first.`
      );
    }

    const deletedAt = new Date();
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { deletedAt } }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: data.reason ? `Archived: ${data.reason}` : 'Order archived by admin',
          changedBy: adminId,
        },
      }),
    ]);

    return { orderNumber: order.orderNumber, deletedAt };
  },

  /** Restore a previously archived order. */
  async restoreOrder(orderNumber: string, adminId: string) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw ApiError.notFound('Order not found');
    if (!order.deletedAt) throw ApiError.badRequest('Order is not archived');

    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { deletedAt: null } }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: 'Order restored from archive',
          changedBy: adminId,
        },
      }),
    ]);

    return { orderNumber: order.orderNumber };
  },
};
