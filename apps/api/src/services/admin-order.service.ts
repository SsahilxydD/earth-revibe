import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { sendWhatsAppOrderUpdate, sendWhatsAppOtp } from './whatsapp.service';
import { logger } from '../config/logger';
import { isCarrierOwnedStatus } from './shiprocket.service';
import { generateOtp, hashOtp, generateReferralCode } from './auth.service';
import { generateOrderNumber } from '@earth-revibe/shared';
import type {
  AdminOrderQuery,
  UpdateOrderStatusInput,
  AddOrderNoteInput,
  CreateManualOrderInput,
  CreateDraftOrderInput,
  UpdateDraftOrderInput,
  VerifyDraftCustomerInput,
  ConfirmOfflineOrderInput,
  UpdateOrderDateInput,
  ArchiveOrderInput,
  SendCustomerOtpInput,
  VerifyCustomerOtpInput,
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
   * Send a WhatsApp OTP to a customer's phone so the admin can verify
   * the number before creating a manual order. Reuses the storefront
   * OTP storage (OtpCode table) + rate limit (3 per 10 min) but does NOT
   * issue a JWT — the admin's session must not be swapped with the
   * customer's. Returns hints for the UI: whether this phone matches an
   * existing customer + whether we already have a name on file.
   */
  async sendCustomerOtp({ phone }: SendCustomerOtpInput) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.otpCode.count({
      where: { phone, createdAt: { gte: tenMinutesAgo } },
    });
    if (recentCount >= 3) {
      throw ApiError.tooManyRequests(
        'Too many OTP requests for this phone. Try again in a few minutes.'
      );
    }

    await prisma.otpCode.deleteMany({
      where: {
        phone,
        OR: [{ expiresAt: { lt: new Date() } }, { verified: true }],
      },
    });

    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });
    await sendWhatsAppOtp(phone, code);

    logger.info(
      { phone: phone.slice(0, 6) + '****', source: 'offline-order' },
      'Customer OTP sent'
    );

    const existing = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, firstName: true, lastName: true },
    });
    const hasName = !!(existing && (existing.firstName?.trim() || existing.lastName?.trim()));
    return { isExistingCustomer: !!existing, hasName };
  },

  /**
   * Verify the OTP and return a userId the admin can pass to
   * createManualOrder. If the customer doesn't yet have an account,
   * create one (same shape as storefront auto-signup via OTP login).
   * Name fields backfill the User if it existed without one.
   * Does NOT log the customer in (no cookies, no JWT).
   */
  async verifyCustomerOtp({ phone, code, firstName, lastName }: VerifyCustomerOtpInput) {
    const otp = await prisma.otpCode.findFirst({
      where: { phone, verified: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw ApiError.badRequest('OTP expired or not found. Send a new one.');
    }
    if (otp.attempts >= 5) {
      throw ApiError.tooManyRequests('Too many attempts. Send a new OTP.');
    }
    if (hashOtp(code) !== otp.codeHash) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw ApiError.badRequest('Invalid OTP');
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { verified: true } });

    const incomingFirst = firstName?.trim() ?? '';
    const incomingLast = lastName?.trim() ?? '';
    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewCustomer = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone.replace('+', '')}@phone.earthrevibe.com`,
          firstName: incomingFirst,
          lastName: incomingLast,
          phoneVerified: true,
          isActive: true,
        },
      });
      user = await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: generateReferralCode(user.id) },
      });
    } else {
      const shouldBackfillFirst = !user.firstName?.trim() && incomingFirst;
      const shouldBackfillLast = !user.lastName?.trim() && incomingLast;
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          ...(shouldBackfillFirst && { firstName: incomingFirst }),
          ...(shouldBackfillLast && { lastName: incomingLast }),
        },
      });
    }

    return {
      userId: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isNewCustomer,
    };
  },

  /**
   * Create a manual order for an offline / in-person sale.
   * - source = OFFLINE, no Razorpay Payment row is created.
   * - REQUIRES a verified `userId` (caller must have completed
   *   verifyCustomerOtp first). The order is linked to that User so
   *   the customer sees it the next time they log in.
   * - Stock is decremented atomically (same race-safe pattern as checkout).
   * - An Address row is created from the verified User so the order has
   *   the schema-required addressId.
   * - The offline payment method (cash/UPI/etc.) is recorded as an internal note.
   */
  async createManualOrder(adminId: string, data: CreateManualOrderInput) {
    const variantIds = [...new Set(data.items.map((i) => i.variantId))];
    const orderNumber = generateOrderNumber();

    // Verify the caller actually completed verifyCustomerOtp first.
    // The schema requires userId, but a hostile client could pass a
    // random uuid — confirm the User row exists AND has phoneVerified=true
    // before we link the order to it. Otherwise the "verification step"
    // would be cosmetic.
    const customer = await prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });
    if (!customer || !customer.isActive) {
      throw ApiError.badRequest('Verified customer not found. Re-verify the phone number.');
    }
    if (!customer.phoneVerified) {
      throw ApiError.badRequest('Customer phone is not verified. Send and verify an OTP first.');
    }

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
                category: { select: { offlinePrice: true } },
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
          // Offline default: the category's offlinePrice wins over the online
          // price; an explicit per-line unitPrice from the admin still wins over all.
          const offline = v.product.category?.offlinePrice;
          const unitPrice =
            item.unitPrice ??
            (offline != null ? Number(offline) : Number(v.price) || Number(v.product.price));
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

        // Order.addressId is required → create an address from the verified
        // customer's profile. Offline sales don't have a real delivery
        // address, but the schema needs one and the verified phone/name
        // give us a meaningful record.
        const customerName =
          `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Offline customer';
        const address = await tx.address.create({
          data: {
            userId: customer.id,
            label: 'Offline',
            fullName: customerName,
            phone: customer.phone || '',
            line1: 'Offline / in-person sale',
            city: '-',
            state: '-',
            pinCode: '000000',
          },
        });

        // Optional backdating: an in-person sale recorded after the fact can
        // be dated to when it actually happened. Drives revenue/analytics
        // bucketing and the order-list sort. The initial status-history entry
        // is stamped with the same date so the order's timeline reads
        // consistently with its header date. Omitted → Prisma's @default(now()).
        const backdatedAt = data.orderDate ? new Date(data.orderDate) : undefined;

        const created = await tx.order.create({
          data: {
            orderNumber,
            userId: customer.id,
            addressId: address.id,
            source: 'OFFLINE',
            status: data.status,
            ...(backdatedAt && { createdAt: backdatedAt }),
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
                ...(backdatedAt && { createdAt: backdatedAt }),
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
   * Create a DRAFT offline order for a sale that hasn't been paid yet.
   * Two-phase counterpart to createManualOrder:
   * - Captures a TEMP customer (name + phone) on the order itself
   *   (guestName/guestPhone). No User row is created and no OTP is sent yet —
   *   the customer is verified later, at confirm time.
   * - status = DRAFT, source = OFFLINE. NO stock is reserved (the cart is just
   *   parked) and the order is excluded from revenue / counts / customer
   *   history until confirmed.
   * - A placeholder Address is still created because Order.addressId is required.
   * - A tentative payment method / note is stored as an internal note.
   */
  async createDraftOrder(adminId: string, data: CreateDraftOrderInput) {
    const variantIds = [...new Set(data.items.map((i) => i.variantId))];
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              category: { select: { offlinePrice: true } },
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
        // Offline default: the category's offlinePrice wins over the online
        // price; an explicit per-line unitPrice from the admin still wins over all.
        const offline = v.product.category?.offlinePrice;
        const unitPrice =
          item.unitPrice ??
          (offline != null ? Number(offline) : Number(v.price) || Number(v.product.price));
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
      if (discountAmount > subtotal) {
        throw ApiError.badRequest(`Discount (₹${discountAmount}) exceeds subtotal (₹${subtotal})`);
      }
      const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

      // Placeholder address — no real delivery address for an offline draft,
      // but Order.addressId is required. userId is null until verification.
      const address = await tx.address.create({
        data: {
          label: 'Offline',
          fullName: data.guestName,
          phone: data.guestPhone,
          line1: 'Offline / in-person sale',
          city: '-',
          state: '-',
          pinCode: '000000',
        },
      });

      // Optional backdating set at draft time carries through unchanged when
      // the draft is later confirmed (confirm never rewrites createdAt), so the
      // finalized offline order lands in the right revenue/analytics bucket.
      const backdatedAt = data.orderDate ? new Date(data.orderDate) : undefined;

      const created = await tx.order.create({
        data: {
          orderNumber,
          // userId intentionally null — the temp customer isn't a User yet.
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          addressId: address.id,
          source: 'OFFLINE',
          status: 'DRAFT',
          ...(backdatedAt && { createdAt: backdatedAt }),
          subtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          totalAmount,
          items: { create: orderItems },
          statusHistory: {
            create: {
              status: 'DRAFT',
              note: 'Draft offline order created (awaiting payment + verification)',
              changedBy: adminId,
              ...(backdatedAt && { createdAt: backdatedAt }),
            },
          },
        },
        include: { items: true },
      });

      const noteParts: string[] = [];
      if (data.paymentMethod) noteParts.push(`Tentative payment method: ${data.paymentMethod}`);
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
    });

    return order;
  },

  /**
   * Edit a still-DRAFT offline order before it's confirmed. Drafts reserve no
   * stock and are excluded from revenue/history, so items, the temp customer
   * (guestName/guestPhone), and totals can all be freely replaced. Mirrors the
   * pricing logic of createDraftOrder; line items are swapped wholesale (nothing
   * to restock). Rejected once the order leaves DRAFT.
   */
  async updateDraftOrder(adminId: string, orderNumber: string, data: UpdateDraftOrderInput) {
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true, source: true, deletedAt: true, addressId: true },
    });
    if (!existing) throw ApiError.notFound('Order not found');
    if (existing.deletedAt) throw ApiError.badRequest('Order is archived. Restore it first.');
    if (existing.status !== 'DRAFT' || existing.source !== 'OFFLINE') {
      throw ApiError.badRequest('Only draft offline orders can be edited.');
    }

    const variantIds = [...new Set(data.items.map((i) => i.variantId))];

    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              category: { select: { offlinePrice: true } },
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
        const offline = v.product.category?.offlinePrice;
        const unitPrice =
          item.unitPrice ??
          (offline != null ? Number(offline) : Number(v.price) || Number(v.product.price));
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
      if (discountAmount > subtotal) {
        throw ApiError.badRequest(`Discount (₹${discountAmount}) exceeds subtotal (₹${subtotal})`);
      }
      const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

      // Replace the line items wholesale — no stock was reserved for a draft,
      // so there is nothing to restock when we drop the old rows.
      await tx.orderItem.deleteMany({ where: { orderId: existing.id } });

      const updated = await tx.order.update({
        where: { id: existing.id },
        data: {
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          subtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          totalAmount,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Keep the placeholder address in sync with the temp customer.
      if (existing.addressId) {
        await tx.address.update({
          where: { id: existing.addressId },
          data: { fullName: data.guestName, phone: data.guestPhone },
        });
      }

      const noteParts: string[] = [];
      if (data.paymentMethod) noteParts.push(`Tentative payment method: ${data.paymentMethod}`);
      if (data.note) noteParts.push(data.note);
      if (noteParts.length > 0) {
        await tx.orderNote.create({
          data: {
            orderId: existing.id,
            userId: adminId,
            content: noteParts.join('\n'),
            isInternal: true,
          },
        });
      }

      return updated;
    });

    return order;
  },

  /**
   * Send a WhatsApp OTP to the temp customer on a DRAFT order. The phone is
   * read from the order's guestPhone server-side (the admin can't retarget it).
   */
  async sendDraftCustomerOtp(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { status: true, source: true, guestPhone: true },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.status !== 'DRAFT' || order.source !== 'OFFLINE') {
      throw ApiError.badRequest('Only draft offline orders have a customer to verify.');
    }
    if (!order.guestPhone) {
      throw ApiError.badRequest('This draft has no customer phone on file.');
    }
    return this.sendCustomerOtp({ phone: order.guestPhone });
  },

  /**
   * Verify the temp customer on a DRAFT order and attach the resulting User.
   * Reuses verifyCustomerOtp (creates/finds the User, marks phoneVerified) then
   * links it to the order. Name falls back to the guestName captured at draft
   * time when the admin doesn't re-enter it. Does NOT confirm the order.
   */
  async verifyDraftCustomer(orderNumber: string, data: VerifyDraftCustomerInput) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true, source: true, guestPhone: true, guestName: true },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.status !== 'DRAFT' || order.source !== 'OFFLINE') {
      throw ApiError.badRequest('Only draft offline orders can be verified.');
    }
    if (!order.guestPhone) {
      throw ApiError.badRequest('This draft has no customer phone on file.');
    }

    // Fall back to the name captured at draft time if not re-entered.
    const [guestFirst, ...guestRest] = (order.guestName ?? '').trim().split(/\s+/);
    const firstName = data.firstName?.trim() || guestFirst || undefined;
    const lastName = data.lastName?.trim() || guestRest.join(' ') || undefined;

    const result = await this.verifyCustomerOtp({
      phone: order.guestPhone,
      code: data.code,
      firstName,
      lastName,
    });

    // Link the verified customer to the draft (and to the placeholder address).
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { userId: result.userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });
    await prisma.address
      .updateMany({
        where: { orders: { some: { id: order.id } } },
        data: { userId: result.userId },
      })
      .catch(() => undefined);

    return { ...result, order: updated };
  },

  /**
   * Confirm a DRAFT offline order into a real OFFLINE order once payment has
   * been received. REQUIRES the customer to be OTP-verified first (userId set +
   * phoneVerified). Reserves stock atomically (same race-safe pattern as
   * checkout / createManualOrder) and sets the final status. The offline
   * payment method is recorded as an internal note.
   */
  async confirmOfflineOrder(adminId: string, orderNumber: string, data: ConfirmOfflineOrderInput) {
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, user: { select: { id: true, phoneVerified: true, isActive: true } } },
    });
    if (!existing) throw ApiError.notFound('Order not found');
    if (existing.deletedAt) throw ApiError.badRequest('Order is archived. Restore it first.');
    if (existing.status !== 'DRAFT' || existing.source !== 'OFFLINE') {
      throw ApiError.badRequest('Only draft offline orders can be confirmed.');
    }
    // Verification gate — every confirmed OFFLINE order links to a verified
    // customer so it surfaces in their account when they log in via OTP.
    if (!existing.userId || !existing.user) {
      throw ApiError.badRequest('Verify the customer (OTP) before confirming this order.');
    }
    if (!existing.user.isActive) {
      throw ApiError.badRequest('Customer account is inactive. Re-verify the phone number.');
    }
    if (!existing.user.phoneVerified) {
      throw ApiError.badRequest(
        'Customer phone is not verified. Verify via OTP before confirming.'
      );
    }
    if (existing.items.length === 0) {
      throw ApiError.badRequest('Draft has no items to confirm.');
    }

    const order = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Reserve stock now (it was deliberately not reserved at draft time).
        for (const item of existing.items) {
          const result = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw ApiError.conflict(`Insufficient stock for ${item.productName}`);
          }
        }

        // Optional backdating at confirm time overrides the draft's date.
        // Only the order's effective date moves; the confirm status-history
        // entry keeps real wall-clock time so the draft→confirm timeline stays
        // correctly ordered (a backdated confirm entry could otherwise sort
        // before the original DRAFT entry).
        const backdatedAt = data.orderDate ? new Date(data.orderDate) : undefined;

        const updated = await tx.order.update({
          where: { id: existing.id },
          data: {
            status: data.status,
            ...(backdatedAt && { createdAt: backdatedAt }),
            statusHistory: {
              create: {
                status: data.status,
                note: 'Offline order confirmed (payment received)',
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
              orderId: existing.id,
              userId: adminId,
              content: noteParts.join('\n'),
              isInternal: true,
            },
          });
        }

        return updated;
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

  /**
   * Re-date an existing OFFLINE order — backdate a sale that was entered late.
   * createdAt is the order's effective date: it's what revenue/analytics bucket
   * by and what the order list sorts on. ONLINE orders are rejected (their date
   * is pinned to the real Razorpay checkout/payment time). The change is logged
   * as an internal note so the audit trail records who moved it and from when.
   */
  async updateOrderDate(orderNumber: string, adminId: string, data: UpdateOrderDateInput) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, source: true, deletedAt: true, createdAt: true },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.deletedAt) throw ApiError.badRequest('Order is archived. Restore it first.');
    if (order.source !== 'OFFLINE') {
      throw ApiError.badRequest('Only offline orders can be re-dated.');
    }

    const newDate = new Date(data.orderDate);
    const previous = order.createdAt;

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const u = await tx.order.update({
        where: { id: order.id },
        data: { createdAt: newDate },
        select: { orderNumber: true, createdAt: true },
      });
      await tx.orderNote.create({
        data: {
          orderId: order.id,
          userId: adminId,
          content: `Order date changed from ${previous.toISOString()} to ${newDate.toISOString()}`,
          isInternal: true,
        },
      });
      return u;
    });

    return updated;
  },
};
