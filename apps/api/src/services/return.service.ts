import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { logger } from '../config/logger';
import { generateOrderNumber, ReturnStatus, ReturnType } from '@earth-revibe/shared';
import { shiprocketService } from './shiprocket.service';
import { sendReturnUpdateToDiscord } from './discord.service';
import { settingsService } from './settings.service';
import type {
  CreateReturnRequestInput,
  UpdateReturnStatusInput,
  ReturnQuery,
} from '@earth-revibe/shared';

// Reason codes where a received item can't go back on the shelf.
const NON_RESTOCKABLE_REASONS = new Set(['DEFECTIVE', 'DAMAGED_IN_TRANSIT']);

// Admin-drivable ReturnStatus transitions (REQUESTED→… lifecycle).
const VALID_RETURN_TRANSITIONS: Record<string, ReturnStatus[]> = {
  [ReturnStatus.REQUESTED]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],
  [ReturnStatus.APPROVED]: [ReturnStatus.PICKED_UP, ReturnStatus.RECEIVED, ReturnStatus.REJECTED],
  [ReturnStatus.PICKED_UP]: [ReturnStatus.RECEIVED],
  [ReturnStatus.RECEIVED]: [ReturnStatus.REFUND_INITIATED, ReturnStatus.COMPLETED],
  [ReturnStatus.REFUND_INITIATED]: [ReturnStatus.COMPLETED],
  [ReturnStatus.REJECTED]: [],
  [ReturnStatus.COMPLETED]: [],
};

type ReturnWithItems = Prisma.ReturnRequestGetPayload<{ include: { items: true } }>;

/** Enrich a return's bare items with the order-line snapshot for display. */
async function shapeReturn(ret: ReturnWithItems & { order?: { orderNumber: string } }) {
  const orderItemIds = ret.items.map((i) => i.orderItemId);
  const orderItems = orderItemIds.length
    ? await prisma.orderItem.findMany({ where: { id: { in: orderItemIds } } })
    : [];
  const byId = new Map(orderItems.map((o) => [o.id, o]));
  return {
    ...ret,
    refundAmount: ret.refundAmount != null ? Number(ret.refundAmount) : null,
    items: ret.items.map((ri) => {
      const oi = byId.get(ri.orderItemId);
      return {
        id: ri.id,
        orderItemId: ri.orderItemId,
        quantity: ri.quantity,
        exchangeVariantId: ri.exchangeVariantId,
        productName: oi?.productName,
        productImage: oi?.productImage ?? null,
        variantSize: oi?.variantSize,
        variantColor: oi?.variantColor,
      };
    }),
  };
}

/** Units of an order line already covered by a non-rejected return. */
async function returnedQtyByOrderItem(orderId: string): Promise<Map<string, number>> {
  const rows = await prisma.returnItem.findMany({
    where: {
      returnRequest: { orderId, status: { not: ReturnStatus.REJECTED } },
    },
    select: { orderItemId: true, quantity: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.orderItemId, (map.get(r.orderItemId) ?? 0) + r.quantity);
  return map;
}

// Admin Discord alert on return transitions (soft-fail). Customers track their
// return status in-app (/account/returns) rather than via the order-update
// WhatsApp template, which is order-status specific.
function notifyReturn(orderNumber: string, status: ReturnStatus, note?: string) {
  void sendReturnUpdateToDiscord({ orderNumber, status, note }).catch(() => undefined);
}

export const returnService = {
  /**
   * Customer request to return/exchange items of a DELIVERED order, within the
   * configured window (default 72h from delivery). For an eligible EXCHANGE,
   * when autoApproveExchanges is on, immediately processes the swap (reverse
   * pickup + zero-charge replacement shipment); otherwise it waits for admin.
   */
  async requestReturn(userId: string, orderNumber: string, input: CreateReturnRequestInput) {
    const order = await prisma.order.findFirst({
      where: { orderNumber, userId, deletedAt: null },
      include: { items: true },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.status !== 'DELIVERED') {
      throw ApiError.badRequest('Only delivered orders can be returned');
    }

    // 72h window from delivery.
    const settings = await settingsService.getSettings();
    const windowHours = settings.returnWindowHours ?? 72;
    if (!order.deliveredAt) {
      throw ApiError.badRequest(
        'This order has no recorded delivery date, so it is not eligible for self-service return. Please contact support.'
      );
    }
    const deadline = new Date(order.deliveredAt.getTime() + windowHours * 60 * 60 * 1000);
    if (new Date() > deadline) {
      throw ApiError.badRequest(`The ${windowHours}-hour return window for this order has closed.`);
    }

    // Validate each requested line against the order + prior returns.
    const itemsById = new Map(order.items.map((i) => [i.id, i]));
    const alreadyReturned = await returnedQtyByOrderItem(order.id);
    for (const line of input.items) {
      const oi = itemsById.get(line.orderItemId);
      if (!oi) throw ApiError.badRequest('One of the items is not part of this order');
      const remaining = oi.quantity - (alreadyReturned.get(oi.id) ?? 0);
      if (line.quantity > remaining) {
        throw ApiError.badRequest(
          `You can return at most ${remaining} of "${oi.productName}" (already requested for the rest).`
        );
      }
    }

    // Exchange-specific validation: single line, in-stock, same price.
    let exchangeVariant: { id: string; stock: number; isActive: boolean } | null = null;
    if (input.type === ReturnType.EXCHANGE) {
      const line = input.items[0];
      const originalItem = itemsById.get(line.orderItemId)!;
      const variant = await prisma.productVariant.findUnique({
        where: { id: input.exchangeVariantId! },
        include: { product: { select: { id: true, price: true } } },
      });
      if (!variant || !variant.isActive) {
        throw ApiError.badRequest('The chosen replacement is unavailable');
      }
      if (variant.stock < line.quantity) {
        throw ApiError.badRequest('The chosen replacement size/colour is out of stock');
      }
      // Same-price guard: replacement must cost what was paid for the line.
      const replacementPrice = Number(variant.price) || Number(variant.product.price);
      if (Math.abs(replacementPrice - Number(originalItem.unitPrice)) > 0.01) {
        throw ApiError.badRequest(
          'Exchanges are only available for a same-price size/colour. Please choose a refund instead.'
        );
      }
      exchangeVariant = { id: variant.id, stock: variant.stock, isActive: variant.isActive };
    }

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ret = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          userId,
          type: input.type,
          reasonCode: input.reasonCode,
          reason: input.comment ?? null,
          status: ReturnStatus.REQUESTED,
          items: {
            create: input.items.map((l) => ({
              orderItemId: l.orderItemId,
              quantity: l.quantity,
              exchangeVariantId:
                input.type === ReturnType.EXCHANGE ? input.exchangeVariantId! : null,
            })),
          },
          statusHistory: {
            create: {
              status: ReturnStatus.REQUESTED,
              note: `${input.type === ReturnType.EXCHANGE ? 'Exchange' : 'Refund'} requested by customer`,
              changedBy: userId,
            },
          },
        },
        include: { items: true },
      });
      return ret;
    });

    notifyReturn(orderNumber, ReturnStatus.REQUESTED);

    // Auto-process an eligible exchange.
    if (input.type === ReturnType.EXCHANGE && exchangeVariant && settings.autoApproveExchanges) {
      try {
        await this.processExchange(created.id, 'system:auto-exchange');
      } catch (err) {
        // Don't fail the customer's request — the return is recorded; admin can
        // retry the exchange from the console. Alert via Discord.
        logger.error({ err, orderNumber }, 'Auto-exchange processing failed');
        void sendReturnUpdateToDiscord({
          orderNumber,
          status: ReturnStatus.REQUESTED,
          note: 'Auto-exchange failed — needs manual processing',
        }).catch(() => undefined);
      }
    }

    const fresh = await prisma.returnRequest.findUnique({
      where: { id: created.id },
      include: { items: true, order: { select: { orderNumber: true } } },
    });
    return shapeReturn(fresh!);
  },

  /**
   * Process an approved exchange: create the zero-charge replacement order +
   * forward shipment, and schedule a Shiprocket reverse pickup of the original.
   * Idempotent-ish: refuses if a replacement order already exists.
   */
  async processExchange(returnRequestId: string, changedBy: string) {
    const ret = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: { items: true, order: true },
    });
    if (!ret) throw ApiError.notFound('Return not found');
    if (ret.type !== ReturnType.EXCHANGE) throw ApiError.badRequest('Not an exchange');
    if (ret.replacementOrderId) return { replacementOrderId: ret.replacementOrderId };

    const line = ret.items[0];
    if (!line?.exchangeVariantId) throw ApiError.badRequest('Exchange has no replacement variant');
    const originalItem = await prisma.orderItem.findUnique({ where: { id: line.orderItemId } });
    if (!originalItem) throw ApiError.badRequest('Original item not found');

    const replacementOrderNumber = generateOrderNumber();

    // DB txn: re-check stock, decrement, create the replacement order (CONFIRMED,
    // net-zero, OFFLINE so it stays out of revenue), flip the return to APPROVED.
    const replacement = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const variant = await tx.productVariant.findUnique({
          where: { id: line.exchangeVariantId! },
          include: {
            product: {
              select: { name: true, images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        });
        if (!variant) throw ApiError.badRequest('Replacement variant not found');

        const dec = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (dec.count === 0) throw ApiError.conflict('Replacement variant went out of stock');

        const unit = Number(originalItem.unitPrice);
        const subtotal = unit * line.quantity;
        const replacementOrder = await tx.order.create({
          data: {
            orderNumber: replacementOrderNumber,
            userId: ret.userId ?? ret.order.userId,
            addressId: ret.order.addressId,
            source: 'OFFLINE',
            status: 'CONFIRMED',
            subtotal,
            // 100% "exchange" discount → net zero, excluded from revenue.
            discountAmount: subtotal,
            totalAmount: 0,
            items: {
              create: {
                variantId: variant.id,
                quantity: line.quantity,
                unitPrice: unit,
                totalPrice: subtotal,
                productName: variant.product.name,
                productImage: variant.product.images[0]?.url || null,
                variantSize: variant.size,
                variantColor: variant.color,
              },
            },
            statusHistory: {
              create: {
                status: 'CONFIRMED',
                note: `Exchange replacement for order #${ret.order.orderNumber}`,
                changedBy,
              },
            },
          },
        });

        await tx.returnRequest.update({
          where: { id: ret.id },
          data: { status: ReturnStatus.APPROVED, replacementOrderId: replacementOrder.id },
        });
        await tx.returnStatusHistory.create({
          data: {
            returnRequestId: ret.id,
            status: ReturnStatus.APPROVED,
            note: `Auto-approved exchange — replacement order #${replacementOrder.orderNumber} created`,
            changedBy,
          },
        });

        return replacementOrder;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // External, post-commit, best-effort: forward shipment for the replacement +
    // reverse pickup of the original. Failures don't roll back the swap; the
    // reconcile cron retries forward shipments and admin gets a Discord alert.
    shiprocketService.createShiprocketOrder(replacement.id).catch((err) => {
      logger.error(
        { err, orderNumber: replacement.orderNumber },
        'Failed to create Shiprocket shipment for exchange replacement (reconcile cron will retry)'
      );
    });
    shiprocketService.createReturnOrder(ret.id).catch((err) => {
      logger.error({ err, returnId: ret.id }, 'Failed to schedule reverse pickup for exchange');
      void sendReturnUpdateToDiscord({
        orderNumber: ret.order.orderNumber,
        status: ReturnStatus.APPROVED,
        note: 'Reverse pickup scheduling failed — arrange pickup manually',
      }).catch(() => undefined);
    });

    notifyReturn(ret.order.orderNumber, ReturnStatus.APPROVED);
    return { replacementOrderId: replacement.id };
  },

  // ── Customer reads ────────────────────────────────────────────────
  async listForUser(userId: string) {
    const returns = await prisma.returnRequest.findMany({
      where: { order: { userId } },
      include: { items: true, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(returns.map((r) => shapeReturn(r)));
  },

  async getForUser(userId: string, returnId: string) {
    const ret = await prisma.returnRequest.findFirst({
      where: { id: returnId, order: { userId } },
      include: {
        items: true,
        order: { select: { orderNumber: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ret) throw ApiError.notFound('Return not found');
    return { ...(await shapeReturn(ret)), statusHistory: ret.statusHistory };
  },

  // ── Admin ─────────────────────────────────────────────────────────
  async listAll(query: ReturnQuery) {
    const { status, type, search, page, limit } = query;
    const where: Prisma.ReturnRequestWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.order = {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          order: {
            select: {
              orderNumber: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
      prisma.returnRequest.count({ where }),
    ]);

    const returns = await Promise.all(rows.map((r) => shapeReturn(r)));
    return { returns, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOne(returnId: string) {
    const ret = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        order: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            address: true,
            payment: { select: { status: true, method: true, amount: true } },
          },
        },
      },
    });
    if (!ret) throw ApiError.notFound('Return not found');
    return { ...(await shapeReturn(ret)), statusHistory: ret.statusHistory, order: ret.order };
  },

  /**
   * Admin transition of a return. Approving an EXCHANGE triggers the automated
   * swap. Marking RECEIVED restocks (unless the reason is defective/damaged or
   * the admin opts out). The actual refund is issued separately via the admin
   * refund endpoint, which calls linkRefund() to advance the status.
   */
  async updateStatus(returnId: string, adminId: string, data: UpdateReturnStatusInput) {
    const ret = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { items: true, order: { select: { orderNumber: true, userId: true } } },
    });
    if (!ret) throw ApiError.notFound('Return not found');

    const allowed = VALID_RETURN_TRANSITIONS[ret.status] ?? [];
    if (!allowed.includes(data.status)) {
      throw ApiError.badRequest(
        `Cannot move return from ${ret.status} to ${data.status}. Allowed: ${allowed.join(', ') || 'none'}`
      );
    }

    // Approving an exchange runs the automated swap instead of a plain status flip.
    if (data.status === ReturnStatus.APPROVED && ret.type === ReturnType.EXCHANGE) {
      await this.processExchange(ret.id, adminId);
      return this.getOne(returnId);
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.returnRequest.update({
        where: { id: ret.id },
        data: { status: data.status, ...(data.adminNote ? { adminNote: data.adminNote } : {}) },
      });
      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: ret.id,
          status: data.status,
          note: data.adminNote || `Marked ${data.status} by admin`,
          changedBy: adminId,
        },
      });

      // Restock on RECEIVED unless defective/damaged or explicitly opted out.
      if (data.status === ReturnStatus.RECEIVED) {
        const restock = data.restock ?? !NON_RESTOCKABLE_REASONS.has(ret.reasonCode);
        if (restock) {
          const orderItems = await tx.orderItem.findMany({
            where: { id: { in: ret.items.map((i) => i.orderItemId) } },
          });
          const variantByItem = new Map(orderItems.map((o) => [o.id, o.variantId]));
          for (const ri of ret.items) {
            const variantId = variantByItem.get(ri.orderItemId);
            if (variantId) {
              await tx.productVariant.update({
                where: { id: variantId },
                data: { stock: { increment: ri.quantity } },
              });
            }
          }
        }
      }
    });

    notifyReturn(ret.order.orderNumber, data.status);
    return this.getOne(returnId);
  },

  /**
   * Called from the admin refund flow (admin-refund.controller) inside its own
   * transaction. Advances a REFUND-type return's lifecycle to track the refund.
   */
  async linkRefund(
    tx: Prisma.TransactionClient,
    orderId: string,
    refundAmount: number,
    isFullRefund: boolean,
    changedBy: string
  ) {
    const ret = await tx.returnRequest.findFirst({
      where: {
        orderId,
        type: ReturnType.REFUND,
        status: { notIn: [ReturnStatus.REJECTED, ReturnStatus.COMPLETED] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!ret) return; // refund not tied to a return — no-op

    const nextStatus = isFullRefund ? ReturnStatus.COMPLETED : ReturnStatus.REFUND_INITIATED;
    await tx.returnRequest.update({
      where: { id: ret.id },
      data: { status: nextStatus, refundAmount },
    });
    await tx.returnStatusHistory.create({
      data: {
        returnRequestId: ret.id,
        status: nextStatus,
        note: `Refund of ₹${refundAmount.toFixed(2)} issued`,
        changedBy,
      },
    });
  },
};
