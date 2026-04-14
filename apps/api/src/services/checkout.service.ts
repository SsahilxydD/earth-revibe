import crypto from 'crypto';
import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { getRazorpay } from '../config/razorpay';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { APP_CONSTANTS } from '../config/constants';
import { generateOrderNumber } from '@earth-revibe/shared';
import { shiprocketService } from './shiprocket.service';
import { sendWhatsAppOrderUpdate } from './whatsapp.service';
import { getPostHog } from '../config/posthog';
import { sendMetaEvent } from '../utils/meta-conversions';
import type {
  CreateMagicCheckoutInput,
  CreateCodOrderInput,
  ShippingInfoRequest,
  GetPromotionsRequest,
  ApplyPromotionRequest,
  VerifyPaymentInput,
} from '@earth-revibe/shared';

/** Delete a record, silently ignoring P2025 ("record not found") from concurrent deletes. */
async function idempotentDelete<T>(deleteOp: Promise<T>): Promise<T | null> {
  try {
    return await deleteOp;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return null; // already deleted by another process
    }
    throw err;
  }
}

export const checkoutService = {
  /**
   * Create a Razorpay order with line_items for Magic Checkout.
   * Supports both authenticated users (userId) and guest checkout (guestEmail).
   */
  async createMagicOrder(userId: string | null, data: CreateMagicCheckoutInput) {
    const guestEmail = data.guestEmail;
    const isGuest = !userId;

    // With Magic Checkout, Razorpay collects the email during payment.
    // We no longer require it upfront for guest checkout.

    // Fetch variants with product data
    const variantIds = data.items.map((i: { variantId: string }) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    if (variants.length !== variantIds.length) {
      throw ApiError.badRequest('One or more items are no longer available');
    }

    // Check stock and build line items
    const lineItems: Array<Record<string, unknown>> = [];
    let lineItemsTotal = 0;

    for (const reqItem of data.items) {
      const variant = variants.find((v) => v.id === reqItem.variantId);
      if (!variant) throw ApiError.badRequest(`Variant ${reqItem.variantId} not found`);
      if (variant.stock < reqItem.quantity) {
        throw ApiError.badRequest(
          `${variant.product.name} (${variant.size}) only has ${variant.stock} in stock`
        );
      }

      const unitPrice = Number(variant.price) || Number(variant.product.price);
      const itemTotal = unitPrice * reqItem.quantity;
      lineItemsTotal += itemTotal;

      lineItems.push({
        type: 'e-commerce',
        sku: variant.id,
        variant_id: variant.id,
        price: Math.round(unitPrice * 100), // paise
        offer_price: Math.round(unitPrice * 100),
        quantity: reqItem.quantity,
        name: variant.product.name,
        description: `${variant.size} / ${variant.color}`,
        image_url: variant.product.images[0]?.url || undefined,
      });
    }

    // Collect product/category IDs for discount applicability check
    const cartProductIds = variants.map((v) => v.product.id);
    const cartCategoryIds: string[] = [];
    // Category IDs require a separate lookup if not already included
    if (data.discountCode) {
      const productsWithCat = await prisma.product.findMany({
        where: { id: { in: cartProductIds } },
        select: { id: true, categoryId: true },
      });
      cartCategoryIds.push(...productsWithCat.map((p) => p.categoryId));
    }

    // Apply discount if provided
    let discountAmount = 0;
    if (data.discountCode) {
      discountAmount = await calculateDiscount(
        data.discountCode,
        lineItemsTotal,
        userId,
        cartProductIds,
        cartCategoryIds
      );
    }

    // Apply loyalty points (only for authenticated users)
    let loyaltyDiscount = 0;
    if (!isGuest && data.loyaltyPointsToUse > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < data.loyaltyPointsToUse) {
        throw ApiError.badRequest('Insufficient loyalty points');
      }

      // Check minimum redemption threshold
      const loyaltyConfig = await prisma.loyaltyConfig.findFirst({ where: { isActive: true } });
      if (loyaltyConfig && data.loyaltyPointsToUse < loyaltyConfig.minRedeemPoints) {
        throw ApiError.badRequest(
          `Minimum ${loyaltyConfig.minRedeemPoints} points required for redemption`
        );
      }

      // Cap loyalty discount at remaining amount after discount
      const maxLoyaltyDiscount = Math.max(lineItemsTotal - discountAmount, 0);
      loyaltyDiscount = Math.min(data.loyaltyPointsToUse, maxLoyaltyDiscount);
    }

    // Cap total discount so the order is at least ₹1 (Razorpay minimum)
    const maxDiscount = lineItemsTotal - 1;
    if (discountAmount > maxDiscount) discountAmount = Math.max(maxDiscount, 0);
    const totalBeforeShipping = Math.max(lineItemsTotal - discountAmount - loyaltyDiscount, 1);
    const orderNumber = generateOrderNumber();

    // Run Razorpay order creation and user prefill query in parallel.
    // The Razorpay API call (~200-800ms) is the main bottleneck — overlapping
    // it with the prefill query saves a full DB round-trip.
    const effectiveTotal = Math.round(totalBeforeShipping * 100); // paise

    const prefillPromise = !isGuest
      ? prisma.user.findUnique({
          where: { id: userId! },
          select: { email: true, firstName: true, lastName: true, phone: true },
        })
      : Promise.resolve(null);

    const [razorpayOrder, prefillUser] = await Promise.all([
      getRazorpay().orders.create({
        amount: effectiveTotal,
        currency: 'INR',
        receipt: orderNumber,
        line_items_total: effectiveTotal,
        shipping_fee: 0,
        cod: true,
        cod_fee: 15000,
        line_items: lineItems,
        notes: {
          userId: userId || 'guest',
          guestEmail: guestEmail || '',
          orderNumber,
          discountCode: data.discountCode || '',
          discountAmount: String(discountAmount),
          loyaltyPointsToUse: String(isGuest ? 0 : data.loyaltyPointsToUse),
          items: data.items
            .map((ci: { variantId: string; quantity: number }) => {
              const v = variants.find((v) => v.id === ci.variantId)!;
              const price = Number(v.price) || Number(v.product.price);
              return `${v.product.name} (${v.size}) x${ci.quantity} @${price}`;
            })
            .join('; ')
            .slice(0, 256),
          subtotal: String(lineItemsTotal),
          total: String(totalBeforeShipping),
        },
      } as any),
      prefillPromise,
    ]);

    // Reserve inventory and store pending checkout atomically
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        for (const reqItem of data.items) {
          const currentVariant = await tx.productVariant.findUnique({
            where: { id: reqItem.variantId },
            select: { price: true, stock: true, product: { select: { price: true, name: true } } },
          });
          if (!currentVariant) {
            throw ApiError.badRequest(`Product variant is no longer available`);
          }
          const currentPrice = Number(currentVariant.price) || Number(currentVariant.product.price);
          const expectedVariant = variants.find((v) => v.id === reqItem.variantId)!;
          const expectedPrice =
            Number(expectedVariant.price) || Number(expectedVariant.product.price);
          if (currentPrice !== expectedPrice) {
            throw ApiError.conflict(
              `Price changed for ${currentVariant.product.name}. Please refresh your cart.`
            );
          }
          if (currentVariant.stock < reqItem.quantity) {
            throw ApiError.conflict(
              `Insufficient stock for ${currentVariant.product.name}. Only ${currentVariant.stock} available.`
            );
          }

          const result = await tx.productVariant.updateMany({
            where: { id: reqItem.variantId, stock: { gte: reqItem.quantity } },
            data: { stock: { decrement: reqItem.quantity } },
          });
          if (result.count === 0) {
            throw ApiError.conflict(`Stock reservation failed for ${currentVariant.product.name}`);
          }
        }

        await tx.pendingCheckout.create({
          data: {
            orderNumber,
            userId: userId || undefined,
            guestEmail: guestEmail || undefined,
            razorpayOrderId: razorpayOrder.id,
            discountCode: data.discountCode || null,
            loyaltyPointsToUse: isGuest ? 0 : data.loyaltyPointsToUse,
            subtotal: lineItemsTotal,
            discountAmount,
            loyaltyDiscount,
            itemsJson: JSON.stringify(data.items),
            stockReserved: true,
            reservedAt: new Date(),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // Build prefill from the already-fetched user data
    let prefill = { name: '', email: guestEmail || '', contact: '' };
    if (prefillUser) {
      let phone = prefillUser.phone || '';
      if (phone && !phone.startsWith('+')) phone = `+91${phone}`;
      prefill = {
        name: `${prefillUser.firstName} ${prefillUser.lastName}`.trim(),
        email: prefillUser.email,
        contact: phone,
      };
    }

    return {
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID ?? '',
      amount: totalBeforeShipping,
      orderNumber,
      prefill,
    };
  },

  /**
   * Called by Razorpay's servers to get shipping info for addresses.
   */
  async getShippingInfo(data: ShippingInfoRequest) {
    const addresses = data.addresses.map(
      (addr: { id: string; zipcode: string; country: string; state_code?: string }) => ({
        id: addr.id,
        zipcode: addr.zipcode,
        country: addr.country,
        shipping_methods: [
          {
            id: 'standard',
            name: 'Free Delivery',
            description: '5-7 business days',
            serviceable: addr.country === 'IN',
            shipping_fee: 0,
            cod: true,
            cod_fee: 15000,
          },
        ],
      })
    );

    return { addresses };
  },

  /**
   * Called by Razorpay to get available promotions for an order.
   */
  async getPromotions(_data: GetPromotionsRequest) {
    // Fetch active discount codes
    const now = new Date();
    const discounts = await prisma.discountCode.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gt: now },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const promotions = discounts.map((d) => ({
      reference_id: d.code,
      type: 'coupon' as const,
      code: d.code,
      value:
        d.type === 'PERCENTAGE'
          ? String(Math.round(Number(d.value) * 100))
          : String(Math.round(Number(d.value) * 100)),
      value_type: d.type === 'PERCENTAGE' ? 'percentage' : 'fixed_amount',
      description:
        d.type === 'PERCENTAGE'
          ? `${d.value}% off${d.maxDiscountAmount ? ` (up to ₹${d.maxDiscountAmount})` : ''}`
          : `₹${d.value} off`,
      summary: d.minOrderValue ? `Min order ₹${d.minOrderValue}` : 'No minimum order',
    }));

    return { promotions };
  },

  /**
   * Called by Razorpay when customer applies a promotion code.
   * Razorpay sends: { order_id: "order_xxx", code: "SAHIL" }
   * where order_id is the Razorpay order ID (NOT our orderNumber).
   */
  async applyPromotion(data: ApplyPromotionRequest) {
    logger.info({ data }, 'applyPromotion called by Razorpay');

    // Razorpay sends the razorpay order ID — try that first, then our orderNumber
    let pending = await prisma.pendingCheckout.findUnique({
      where: { razorpayOrderId: data.order_id },
    });
    if (!pending) {
      pending = await prisma.pendingCheckout.findUnique({
        where: { orderNumber: data.order_id },
      });
    }

    if (!pending) {
      logger.warn({ order_id: data.order_id }, 'applyPromotion: order not found');
      return { promotion_not_applicable: true };
    }

    const subtotal = Number(pending.subtotal);

    try {
      const discountAmount = await calculateDiscount(data.code, subtotal);

      return {
        promotion: {
          reference_id: data.code,
          type: 'coupon',
          code: data.code,
          value: String(Math.round(discountAmount * 100)),
          value_type: 'fixed_amount',
          description: `${data.code} — ₹${discountAmount} off`,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Invalid code';
      logger.warn({ code: data.code, message }, 'applyPromotion: code invalid');
      return { promotion_not_applicable: true };
    }
  },

  /**
   * Verify Magic Checkout payment and create the final order.
   * Supports both authenticated users and guest checkout.
   *
   * Delegates to finalizeOrderFromPending() which is also called by the
   * webhook handler as a safety net for orders that fail client-side verification.
   */
  async verifyMagicPayment(userId: string | null, data: VerifyPaymentInput) {
    // Verify HMAC signature
    if (!env.RAZORPAY_KEY_SECRET) {
      throw ApiError.badRequest('Razorpay is not configured');
    }
    const body = data.razorpayOrderId + '|' + data.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const receivedBuf = Buffer.from(data.razorpaySignature, 'hex');
    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw ApiError.badRequest('Payment verification failed');
    }

    // Find the pending checkout — match by razorpayOrderId (works for both guest and authenticated)
    const pending = await prisma.pendingCheckout.findUnique({
      where: { razorpayOrderId: data.razorpayOrderId },
    });

    if (!pending) {
      // Pending checkout may already have been finalized by webhook — check for existing order
      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId: data.razorpayOrderId },
        include: {
          order: { select: { orderNumber: true, loyaltyPointsEarned: true, userId: true } },
        },
      });
      if (existingPayment?.order) {
        // Ownership: only reject when an authenticated user doesn't match a
        // different authenticated owner. Guest callers with a valid HMAC
        // signature (verified above) are allowed — the webhook may have
        // auto-linked the order to an existing user by email/phone.
        const orderUserId = existingPayment.order.userId;
        if (userId && orderUserId && orderUserId !== userId) {
          throw ApiError.forbidden('Checkout session does not belong to this user');
        }
        return {
          orderNumber: existingPayment.order.orderNumber,
          pointsEarned: existingPayment.order.loyaltyPointsEarned,
          accountAutoCreated: false,
        };
      }
      throw ApiError.notFound('Checkout session not found');
    }

    // Security: if an authenticated user is verifying, ensure it matches the pending checkout's userId
    if (userId && pending.userId && pending.userId !== userId) {
      throw ApiError.forbidden('Checkout session does not belong to this user');
    }

    const result = await finalizeOrderFromPending(pending, {
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
    });

    // If null, order was already created (e.g. by webhook racing ahead)
    if (!result) {
      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId: data.razorpayOrderId },
        include: {
          order: { select: { orderNumber: true, loyaltyPointsEarned: true, userId: true } },
        },
      });
      // Ownership: same logic — only reject auth'd user vs different auth'd owner
      const raceOrderUserId = existingPayment?.order?.userId ?? null;
      if (userId && raceOrderUserId && raceOrderUserId !== userId) {
        throw ApiError.forbidden('Checkout session does not belong to this user');
      }
      return {
        orderNumber: existingPayment?.order?.orderNumber || pending.orderNumber,
        pointsEarned: existingPayment?.order?.loyaltyPointsEarned || 0,
        accountAutoCreated: false,
      };
    }

    return result;
  },
};

/**
 * Finalize an order from a PendingCheckout record.
 * Used by both verifyMagicPayment (happy path) and the webhook fallback
 * (when the client-side verification timed out or failed after payment).
 *
 * Returns null if the order was already finalized (idempotent).
 */
export async function finalizeOrderFromPending(
  pending: {
    id: string;
    orderNumber: string;
    userId: string | null;
    guestEmail: string | null;
    razorpayOrderId: string;
    discountCode: string | null;
    loyaltyPointsToUse: number;
    subtotal: any;
    discountAmount: any;
    loyaltyDiscount: any;
    itemsJson: string;
    stockReserved: boolean;
  },
  paymentInfo: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature?: string;
    method?: string;
  }
): Promise<{ orderNumber: string; pointsEarned: number; accountAutoCreated: boolean } | null> {
  // Idempotency: if order already exists for this razorpayOrderId, skip
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayOrderId: paymentInfo.razorpayOrderId },
  });
  if (existingPayment) {
    logger.info(
      { razorpayOrderId: paymentInfo.razorpayOrderId },
      'Order already finalized, skipping'
    );
    return null;
  }

  // Fetch the full Razorpay order for customer details (read-only, safe outside transaction)
  const rzpOrder = (await getRazorpay().orders.fetch(paymentInfo.razorpayOrderId)) as any;
  const customerDetails = rzpOrder.customer_details || {};
  const rzpAddress = customerDetails.shipping_address;

  // Pre-compute read-only data outside transaction for performance
  const customerEmail = customerDetails.email || pending.guestEmail || '';
  const customerPhone = customerDetails.contact?.replace(/^\+91/, '') || '';
  const customerName =
    rzpAddress?.name || `${rzpAddress?.first_name || ''} ${rzpAddress?.last_name || ''}`.trim();

  const cartItems: { variantId: string; quantity: number }[] = JSON.parse(pending.itemsJson);
  const variantIds = cartItems.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: {
        select: { name: true, price: true, images: { where: { isPrimary: true }, take: 1 } },
      },
    },
  });

  let subtotal = 0;
  const orderItems = cartItems.map((ci) => {
    const variant = variants.find((v) => v.id === ci.variantId)!;
    const unitPrice = Number(variant.price) || Number(variant.product.price);
    const totalPrice = unitPrice * ci.quantity;
    subtotal += totalPrice;
    return {
      variantId: ci.variantId,
      quantity: ci.quantity,
      unitPrice,
      totalPrice,
      productName: variant.product.name,
      productImage: variant.product.images[0]?.url || null,
      variantSize: variant.size,
      variantColor: variant.color,
    };
  });

  const discountAmount = Number(pending.discountAmount);
  const loyaltyDiscount = Number(pending.loyaltyDiscount);
  const shippingAmount = 0;
  const totalAmount = Math.max(subtotal - discountAmount - loyaltyDiscount + shippingAmount, 0);

  let discountCodeId: string | null = null;
  if (pending.discountCode) {
    const dc = await prisma.discountCode.findUnique({ where: { code: pending.discountCode } });
    discountCodeId = dc?.id || null;
  }

  const guestEmail = pending.guestEmail || customerDetails.email || null;

  // ── All writes (user, address, order) inside a single transaction ──
  // This prevents orphaned user/address rows if a concurrent request wins the race.
  // Wrapped in try/catch to handle the concurrent unique-constraint race (P2002):
  // both webhook and client can enter the transaction before either inserts a row,
  // and the loser hits a unique violation instead of the findUnique guard.
  type TxResult = {
    orderId: string;
    orderNumber: string;
    pointsEarned: number;
    accountAutoCreated: boolean;
    effectiveUserId: string | null;
    isGuest: boolean;
  };

  let txResult: TxResult;
  try {
    txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Idempotency guard inside transaction — catches most races
      const existingPaymentInTx = await tx.payment.findUnique({
        where: { razorpayOrderId: paymentInfo.razorpayOrderId },
      });
      if (existingPaymentInTx) {
        return {
          orderId: '',
          orderNumber: pending.orderNumber,
          pointsEarned: 0,
          accountAutoCreated: false,
          effectiveUserId: pending.userId,
          isGuest: !pending.userId,
        };
      }

      // ── 1. Resolve user (inside transaction) ──
      let isGuest = !pending.userId;
      let effectiveUserId = pending.userId;
      let accountAutoCreated = false;

      if (isGuest && customerEmail) {
        let existingUser = await tx.user.findUnique({ where: { email: customerEmail } });
        if (!existingUser && customerPhone) {
          existingUser = await tx.user.findFirst({ where: { phone: customerPhone } });
        }

        if (existingUser) {
          effectiveUserId = existingUser.id;
          isGuest = false;
          if (customerPhone && !existingUser.phone) {
            await tx.user.update({
              where: { id: existingUser.id },
              data: { phone: `+91${customerPhone}` },
            });
          }
        } else {
          const nameParts = customerName.split(' ');
          try {
            const newUser = await tx.user.create({
              data: {
                email: customerEmail,
                phone: customerPhone ? `+91${customerPhone}` : undefined,
                firstName: nameParts[0] || 'Customer',
                lastName: nameParts.slice(1).join(' ') || '',
                role: 'CUSTOMER',
                emailVerified: true,
                phoneVerified: !!customerPhone,
                isActive: true,
              },
            });
            effectiveUserId = newUser.id;
            isGuest = false;
            accountAutoCreated = true;
            logger.info(
              { userId: newUser.id, email: customerEmail },
              'Auto-created user from checkout finalization'
            );
          } catch (err) {
            logger.warn(
              { err, email: customerEmail },
              'Failed to auto-create user, continuing as guest'
            );
          }
        }
      } else if (!isGuest && effectiveUserId && customerPhone) {
        const user = await tx.user.findUnique({
          where: { id: effectiveUserId },
          select: { phone: true },
        });
        if (!user?.phone) {
          await tx.user.update({
            where: { id: effectiveUserId },
            data: { phone: customerPhone },
          });
        }
      }

      // ── 2. Save shipping address (inside transaction) ──
      let addressId: string;

      if (rzpAddress) {
        const pinCode = rzpAddress.zipcode || rzpAddress.zip_code || '';
        const line1 = rzpAddress.line1 || rzpAddress.address || '';
        const fullName =
          rzpAddress.name || `${rzpAddress.first_name || ''} ${rzpAddress.last_name || ''}`.trim();
        const phone = customerDetails.contact || '';

        if (!isGuest && effectiveUserId) {
          const existingAddr = await tx.address.findFirst({
            where: { userId: effectiveUserId, pinCode, line1 },
          });
          if (existingAddr) {
            addressId = existingAddr.id;
          } else {
            const addressCount = await tx.address.count({ where: { userId: effectiveUserId } });
            const address = await tx.address.create({
              data: {
                userId: effectiveUserId,
                label: rzpAddress.tag || 'Home',
                fullName,
                phone,
                line1,
                line2: rzpAddress.line2 || '',
                city: rzpAddress.city || '',
                state: rzpAddress.state || '',
                pinCode,
                isDefault: addressCount === 0,
              },
            });
            addressId = address.id;
          }
        } else {
          const address = await tx.address.create({
            data: {
              label: rzpAddress.tag || 'Home',
              fullName,
              phone,
              line1,
              line2: rzpAddress.line2 || '',
              city: rzpAddress.city || '',
              state: rzpAddress.state || '',
              pinCode,
              isDefault: false,
            },
          });
          addressId = address.id;
        }
      } else {
        if (!isGuest && effectiveUserId) {
          const defaultAddr = await tx.address.findFirst({
            where: { userId: effectiveUserId, isDefault: true },
          });
          if (!defaultAddr) {
            throw ApiError.badRequest('No shipping address found');
          }
          addressId = defaultAddr.id;
        } else {
          throw ApiError.badRequest('No shipping address provided for guest checkout');
        }
      }

      // ── 3. Create order ──
      const order = await tx.order.create({
        data: {
          orderNumber: pending.orderNumber,
          userId: effectiveUserId || undefined,
          guestEmail: isGuest ? guestEmail : undefined,
          addressId,
          subtotal,
          discountAmount,
          shippingAmount,
          taxAmount: 0,
          totalAmount,
          loyaltyPointsUsed: pending.loyaltyPointsToUse,
          discountCodeId,
          items: { create: orderItems },
          payment: {
            create: {
              razorpayOrderId: paymentInfo.razorpayOrderId,
              razorpayPaymentId: paymentInfo.razorpayPaymentId,
              razorpaySignature: paymentInfo.razorpaySignature || '',
              amount: totalAmount,
              status: 'CAPTURED',
              method: paymentInfo.method as any,
              paidAt: new Date(),
            },
          },
          status: 'CONFIRMED',
          statusHistory: {
            create: {
              status: 'CONFIRMED',
              note: isGuest
                ? 'Payment received via Magic Checkout (guest)'
                : 'Payment received via Magic Checkout',
            },
          },
        },
      });

      if (discountCodeId) {
        await tx.discountCode.update({
          where: { id: discountCodeId },
          data: { usageCount: { increment: 1 } },
        });
      }

      if (!pending.stockReserved) {
        for (const ci of cartItems) {
          const result = await tx.productVariant.updateMany({
            where: { id: ci.variantId, stock: { gte: ci.quantity } },
            data: { stock: { decrement: ci.quantity } },
          });
          if (result.count === 0) {
            throw ApiError.badRequest(`Insufficient stock for variant ${ci.variantId}`);
          }
        }
      }

      let pointsEarned = 0;
      if (!isGuest && effectiveUserId) {
        if (pending.loyaltyPointsToUse > 0) {
          await tx.user.update({
            where: { id: effectiveUserId },
            data: { loyaltyPoints: { decrement: pending.loyaltyPointsToUse } },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId: effectiveUserId,
              type: 'REDEEMED',
              points: -pending.loyaltyPointsToUse,
              description: `Redeemed for order #${pending.orderNumber}`,
              orderId: order.id,
            },
          });
        }

        pointsEarned = Math.floor(totalAmount / 100);
        if (pointsEarned > 0) {
          await tx.user.update({
            where: { id: effectiveUserId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
          await tx.order.update({
            where: { id: order.id },
            data: { loyaltyPointsEarned: pointsEarned },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId: effectiveUserId,
              type: 'EARNED',
              points: pointsEarned,
              description: `Earned from order #${pending.orderNumber}`,
              orderId: order.id,
            },
          });
        }

        const orderCount = await tx.order.count({
          where: { userId: effectiveUserId, status: { not: 'CANCELLED' } },
        });
        if (orderCount === 1) {
          const referral = await tx.referral.findUnique({ where: { refereeId: effectiveUserId } });
          if (referral && referral.status === 'SIGNED_UP') {
            const REFERRER_REWARD = APP_CONSTANTS.REFERRER_REWARD_POINTS;
            const REFEREE_REWARD = APP_CONSTANTS.REFEREE_REWARD_POINTS;
            await tx.referral.update({
              where: { id: referral.id },
              data: {
                status: 'CONVERTED',
                referrerReward: REFERRER_REWARD,
                refereeReward: REFEREE_REWARD,
              },
            });
            await tx.user.update({
              where: { id: referral.referrerId },
              data: { loyaltyPoints: { increment: REFERRER_REWARD } },
            });
            await tx.loyaltyTransaction.create({
              data: {
                userId: referral.referrerId,
                type: 'BONUS',
                points: REFERRER_REWARD,
                description: 'Referral reward - friend made first purchase',
              },
            });
            await tx.user.update({
              where: { id: effectiveUserId },
              data: { loyaltyPoints: { increment: REFEREE_REWARD } },
            });
            await tx.loyaltyTransaction.create({
              data: {
                userId: effectiveUserId,
                type: 'BONUS',
                points: REFEREE_REWARD,
                description: 'Welcome bonus - first purchase reward',
              },
            });
          }
        }

        const cart = await tx.cart.findUnique({ where: { userId: effectiveUserId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      }

      await tx.pendingCheckout.delete({ where: { id: pending.id } });

      return {
        orderId: order.id,
        orderNumber: pending.orderNumber,
        pointsEarned,
        accountAutoCreated,
        effectiveUserId,
        isGuest,
      };
    });
  } catch (err) {
    // Handle the concurrent race: both webhook and client entered the
    // transaction before either inserted a payment row. The loser hits a
    // unique constraint violation (P2002) on razorpayOrderId/orderNumber.
    // Treat this as idempotent success — the other caller already created the order.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Only treat as idempotent if the conflict is on a field belonging to
      // this payment (razorpayOrderId, orderNumber, razorpayPaymentId).
      // Re-throw unexpected unique violations so they surface properly.
      const target = (err.meta?.target as string[]) || [];
      const expectedFields = ['razorpayOrderId', 'razorpayPaymentId', 'orderNumber'];
      const isExpectedRace = target.some((f) => expectedFields.includes(f));
      if (isExpectedRace) {
        // Verify the payment actually exists before assuming idempotent success.
        // The winning transaction may still be committing, so retry briefly.
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 200 * attempt));
          const confirmedPayment = await prisma.payment.findUnique({
            where: { razorpayOrderId: paymentInfo.razorpayOrderId },
          });
          if (confirmedPayment) {
            logger.info(
              { razorpayOrderId: paymentInfo.razorpayOrderId, conflictField: target },
              'Concurrent finalization race: unique constraint hit, order confirmed exists'
            );
            return null;
          }
        }
        logger.error(
          { razorpayOrderId: paymentInfo.razorpayOrderId, conflictField: target },
          'P2002 on expected field but no payment found after retries — genuine collision, re-throwing'
        );
      }
    }
    throw err;
  }

  const {
    orderId,
    orderNumber: finalOrderNumber,
    pointsEarned,
    accountAutoCreated,
    effectiveUserId,
    isGuest,
  } = txResult;

  // Skip post-transaction work if this was a no-op (idempotency guard inside tx)
  if (!orderId) return null;

  // Fire-and-forget side effects
  shiprocketService.createShiprocketOrder(orderId).catch((sErr) => {
    logger.error({ err: sErr, orderId }, 'Failed to create Shiprocket shipment');
  });

  // WhatsApp order confirmation to customer
  if (customerPhone) {
    const firstName = customerName.split(' ')[0] || '';
    sendWhatsAppOrderUpdate(customerPhone, firstName, finalOrderNumber, 'CONFIRMED').catch(
      (err) => {
        logger.error(
          { err, orderNumber: finalOrderNumber },
          'Failed to send WhatsApp order confirmation'
        );
      }
    );
  }

  const ph = getPostHog();
  if (ph) {
    const distinctId = effectiveUserId || guestEmail || 'anonymous';
    ph.capture({
      distinctId,
      event: 'purchase_completed',
      properties: {
        order_id: finalOrderNumber,
        total: totalAmount,
        item_count: cartItems.length,
        discount_amount: discountAmount,
        payment_method: 'razorpay',
        is_guest: isGuest,
        loyalty_points_earned: pointsEarned,
        account_auto_created: accountAutoCreated,
        $set: guestEmail ? { email: guestEmail } : undefined,
      },
    });
  }

  sendMetaEvent({
    eventName: 'Purchase',
    email: guestEmail || undefined,
    userId: effectiveUserId || undefined,
    value: totalAmount,
    currency: 'INR',
    contentIds: cartItems.map((ci) => ci.variantId),
    contentType: 'product',
    numItems: cartItems.length,
    orderId: finalOrderNumber,
  }).catch(() => {});

  return { orderNumber: finalOrderNumber, pointsEarned, accountAutoCreated };
}

/**
 * Create a COD (Cash on Delivery) order directly without Razorpay.
 * Requires authenticated user. Reserves stock, creates order + payment atomically.
 */
export async function createCodOrder(
  userId: string,
  data: CreateCodOrderInput
): Promise<{ orderNumber: string; total: number; pointsEarned: number }> {
  // Validate address belongs to user
  const address = await prisma.address.findFirst({
    where: { id: data.addressId, userId },
  });
  if (!address) throw ApiError.badRequest('Address not found');

  // Fetch variants with product data
  const variantIds = data.items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  if (variants.length !== variantIds.length) {
    throw ApiError.badRequest('One or more items are no longer available');
  }

  // Check stock and calculate totals
  let subtotal = 0;
  const orderItems: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productName: string;
    productImage: string | null;
    variantSize: string;
    variantColor: string;
  }> = [];

  for (const reqItem of data.items) {
    const variant = variants.find((v) => v.id === reqItem.variantId);
    if (!variant) throw ApiError.badRequest(`Variant ${reqItem.variantId} not found`);
    if (variant.stock < reqItem.quantity) {
      throw ApiError.badRequest(
        `${variant.product.name} (${variant.size}) only has ${variant.stock} in stock`
      );
    }
    const unitPrice = Number(variant.price) || Number(variant.product.price);
    const totalPrice = unitPrice * reqItem.quantity;
    subtotal += totalPrice;
    orderItems.push({
      variantId: variant.id,
      quantity: reqItem.quantity,
      unitPrice,
      totalPrice,
      productName: variant.product.name,
      productImage: variant.product.images[0]?.url || null,
      variantSize: variant.size,
      variantColor: variant.color,
    });
  }

  // Discount
  const cartProductIds = variants.map((v) => v.product.id);
  let discountAmount = 0;
  let discountCodeId: string | null = null;
  if (data.discountCode) {
    const productsWithCat = await prisma.product.findMany({
      where: { id: { in: cartProductIds } },
      select: { id: true, categoryId: true },
    });
    const cartCategoryIds = productsWithCat.map((p) => p.categoryId);
    discountAmount = await calculateDiscount(
      data.discountCode,
      subtotal,
      userId,
      cartProductIds,
      cartCategoryIds
    );
    const dc = await prisma.discountCode.findUnique({ where: { code: data.discountCode } });
    if (dc) discountCodeId = dc.id;
  }

  // Loyalty points
  let loyaltyDiscount = 0;
  if (data.loyaltyPointsToUse > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.loyaltyPoints < data.loyaltyPointsToUse) {
      throw ApiError.badRequest('Insufficient loyalty points');
    }
    const maxLoyaltyDiscount = Math.max(subtotal - discountAmount, 0);
    loyaltyDiscount = Math.min(data.loyaltyPointsToUse, maxLoyaltyDiscount);
  }

  const codFee = env.COD_FEE || 0;
  const totalAmount = Math.max(subtotal - discountAmount - loyaltyDiscount + codFee, 0);
  const orderNumber = generateOrderNumber();

  // Atomic transaction: reserve stock + create order + payment
  const txResult = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Decrement stock
      for (const item of data.items) {
        const result = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw ApiError.conflict('Insufficient stock — please refresh your cart');
        }
      }

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: data.addressId,
          subtotal,
          discountAmount,
          shippingAmount: 0,
          taxAmount: 0,
          totalAmount,
          loyaltyPointsUsed: data.loyaltyPointsToUse,
          discountCodeId,
          items: { create: orderItems },
          payment: {
            create: {
              razorpayOrderId: `cod_${orderNumber}`,
              razorpayPaymentId: null,
              razorpaySignature: '',
              amount: totalAmount,
              status: 'PENDING',
              method: 'COD' as any,
              paidAt: null,
            },
          },
          status: 'CONFIRMED',
          statusHistory: {
            create: { status: 'CONFIRMED', note: 'COD order placed' },
          },
        },
      });

      // Increment discount usage
      if (discountCodeId) {
        await tx.discountCode.update({
          where: { id: discountCodeId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Loyalty points
      let pointsEarned = 0;
      if (data.loyaltyPointsToUse > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { decrement: data.loyaltyPointsToUse } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'REDEEMED',
            points: -data.loyaltyPointsToUse,
            description: `Redeemed for COD order #${orderNumber}`,
            orderId: order.id,
          },
        });
      }

      pointsEarned = Math.floor(totalAmount / 100);
      if (pointsEarned > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: pointsEarned } },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { loyaltyPointsEarned: pointsEarned },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'EARNED',
            points: pointsEarned,
            description: `Earned from COD order #${orderNumber}`,
            orderId: order.id,
          },
        });
      }

      // Referral reward on first order
      const orderCount = await tx.order.count({
        where: { userId, status: { not: 'CANCELLED' } },
      });
      if (orderCount === 1) {
        const referral = await tx.referral.findUnique({ where: { refereeId: userId } });
        if (referral && referral.status === 'SIGNED_UP') {
          const REFERRER_REWARD = APP_CONSTANTS.REFERRER_REWARD_POINTS;
          const REFEREE_REWARD = APP_CONSTANTS.REFEREE_REWARD_POINTS;
          await tx.referral.update({
            where: { id: referral.id },
            data: {
              status: 'CONVERTED',
              referrerReward: REFERRER_REWARD,
              refereeReward: REFEREE_REWARD,
            },
          });
          await tx.user.update({
            where: { id: referral.referrerId },
            data: { loyaltyPoints: { increment: REFERRER_REWARD } },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId: referral.referrerId,
              type: 'BONUS',
              points: REFERRER_REWARD,
              description: 'Referral reward - friend made first purchase',
            },
          });
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: REFEREE_REWARD } },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId,
              type: 'BONUS',
              points: REFEREE_REWARD,
              description: 'Welcome bonus - first purchase reward',
            },
          });
        }
      }

      // Clear server-side cart
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return { orderId: order.id, pointsEarned };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  // Fire-and-forget side effects
  shiprocketService.createShiprocketOrder(txResult.orderId).catch((err) => {
    logger.error({ err, orderId: txResult.orderId }, 'COD: Failed to create Shiprocket shipment');
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, firstName: true },
  });
  if (user?.phone) {
    sendWhatsAppOrderUpdate(user.phone, user.firstName || '', orderNumber, 'CONFIRMED').catch(
      (err) => logger.error({ err, orderNumber }, 'COD: Failed to send WhatsApp confirmation')
    );
  }

  const ph = getPostHog();
  if (ph) {
    ph.capture({
      distinctId: userId,
      event: 'purchase_completed',
      properties: {
        order_id: orderNumber,
        total: totalAmount,
        item_count: data.items.length,
        discount_amount: discountAmount,
        payment_method: 'COD',
        is_guest: false,
        loyalty_points_earned: txResult.pointsEarned,
      },
    });
  }

  sendMetaEvent({
    eventName: 'Purchase',
    userId,
    value: totalAmount,
    currency: 'INR',
    contentIds: variantIds,
    contentType: 'product',
    numItems: data.items.length,
    orderId: orderNumber,
  }).catch(() => {});

  return { orderNumber, total: totalAmount, pointsEarned: txResult.pointsEarned };
}

/**
 * Reconcile stale PendingCheckouts against the Razorpay API.
 *
 * For each checkout older than 30 minutes:
 *  - If Razorpay shows a captured payment → finalize the order (webhook must have failed)
 *  - If Razorpay shows failed/expired or checkout is older than 2h → restore stock and delete
 *  - If payment is still pending and checkout is < 2h old → skip (user might still be paying)
 *
 * This is the ultimate safety net — even if the webhook never fires and the client
 * never calls verifyMagicPayment, this cron ensures every paid order gets created
 * and every abandoned reservation gets released.
 */
export async function reconcileStaleCheckouts(): Promise<{
  finalized: number;
  released: number;
  skipped: number;
  errors: number;
}> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - APP_CONSTANTS.CHECKOUT_EXPIRY_MS);

  const staleCheckouts = await prisma.pendingCheckout.findMany({
    where: { createdAt: { lt: thirtyMinAgo } },
  });

  let finalized = 0;
  let released = 0;
  let skipped = 0;
  let errors = 0;

  for (const checkout of staleCheckouts) {
    try {
      // Skip if order was already finalized (race with webhook)
      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId: checkout.razorpayOrderId },
      });
      if (existingPayment) {
        // Order exists — just clean up the stale PendingCheckout
        if (checkout.stockReserved) {
          // Stock was already decremented by finalizeOrderFromPending, just delete
          await idempotentDelete(prisma.pendingCheckout.delete({ where: { id: checkout.id } }));
        }
        skipped++;
        continue;
      }

      // Check Razorpay for payment status
      let rzpPayments: any;
      try {
        rzpPayments = await getRazorpay().orders.fetchPayments(checkout.razorpayOrderId);
      } catch (rzpErr: any) {
        // Razorpay API error — skip this checkout, try next time
        logger.warn(
          { err: rzpErr, razorpayOrderId: checkout.razorpayOrderId },
          'Reconciliation: failed to fetch Razorpay payments, skipping'
        );
        errors++;
        continue;
      }

      const payments = (rzpPayments as any)?.items || rzpPayments || [];
      const capturedPayment = payments.find?.((p: any) => p.status === 'captured');

      if (capturedPayment) {
        // Payment was captured but order never created — finalize now
        logger.warn(
          { razorpayOrderId: checkout.razorpayOrderId, orderNumber: checkout.orderNumber },
          'Reconciliation: found captured payment with no order — finalizing'
        );

        const result = await finalizeOrderFromPending(checkout, {
          razorpayOrderId: checkout.razorpayOrderId,
          razorpayPaymentId: capturedPayment.id,
          razorpaySignature: '',
          method: mapPaymentMethod(capturedPayment.method),
        });

        if (result) {
          logger.info(
            { orderNumber: checkout.orderNumber },
            'Reconciliation: order finalized successfully'
          );
          finalized++;
        } else {
          // Already finalized by another process
          skipped++;
        }
      } else if (checkout.createdAt < twoHoursAgo) {
        // No captured payment and checkout is old — release stock
        logger.info(
          { razorpayOrderId: checkout.razorpayOrderId, orderNumber: checkout.orderNumber },
          'Reconciliation: no payment after 2h — releasing stock'
        );

        if (checkout.stockReserved) {
          const cartItems: { variantId: string; quantity: number }[] = JSON.parse(
            checkout.itemsJson
          );
          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            for (const item of cartItems) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            }
            await idempotentDelete(tx.pendingCheckout.delete({ where: { id: checkout.id } }));
          });
        } else {
          await idempotentDelete(prisma.pendingCheckout.delete({ where: { id: checkout.id } }));
        }

        released++;
      } else {
        // Payment still pending, checkout < 2h old — user might still be paying
        skipped++;
      }
    } catch (err) {
      logger.error(
        { err, razorpayOrderId: checkout.razorpayOrderId, orderNumber: checkout.orderNumber },
        'Reconciliation: unexpected error processing checkout'
      );
      errors++;
    }
  }

  return { finalized, released, skipped, errors };
}

/**
 * User-triggered sync: find any captured-but-unfinalized payments for this user and create the orders.
 * Called when a user visits the orders page and clicks "Sync Orders" — handles the case where they
 * closed the tab right after payment before the success page or webhook could finalize the order.
 */
export async function syncUserOrders(userId: string): Promise<{ synced: number }> {
  const pendingCheckouts = await prisma.pendingCheckout.findMany({
    where: { userId },
  });

  let synced = 0;

  for (const checkout of pendingCheckouts) {
    try {
      // Skip if already finalized
      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId: checkout.razorpayOrderId },
      });
      if (existingPayment) {
        await idempotentDelete(prisma.pendingCheckout.delete({ where: { id: checkout.id } }));
        continue;
      }

      // Check Razorpay for a captured payment
      let rzpPayments: any;
      try {
        rzpPayments = await getRazorpay().orders.fetchPayments(checkout.razorpayOrderId);
      } catch {
        continue; // Razorpay API error — skip silently, cron will retry
      }

      const payments = (rzpPayments as any)?.items || rzpPayments || [];
      const capturedPayment = payments.find?.((p: any) => p.status === 'captured');

      if (capturedPayment) {
        const result = await finalizeOrderFromPending(checkout, {
          razorpayOrderId: checkout.razorpayOrderId,
          razorpayPaymentId: capturedPayment.id,
          razorpaySignature: '',
          method: mapPaymentMethod(capturedPayment.method),
        });
        if (result) synced++;
      }
    } catch (err) {
      logger.warn({ err, razorpayOrderId: checkout.razorpayOrderId }, 'syncUserOrders: error');
    }
  }

  return { synced };
}

/**
 * @deprecated Use reconcileStaleCheckouts() instead — it checks Razorpay before releasing stock.
 * Kept for backwards compatibility with existing test suite.
 */
export async function restoreExpiredReservations(): Promise<number> {
  const result = await reconcileStaleCheckouts();
  return result.released + result.finalized;
}

function mapPaymentMethod(method: string): string | undefined {
  const map: Record<string, string> = {
    upi: 'UPI',
    card: 'CARD',
    netbanking: 'NETBANKING',
    wallet: 'WALLET',
    emi: 'EMI',
    cod: 'COD',
  };
  return map[method];
}

/** Helper: calculate discount amount for a given code and subtotal */
async function calculateDiscount(
  code: string,
  subtotal: number,
  userId?: string | null,
  cartProductIds?: string[],
  cartCategoryIds?: string[]
): Promise<number> {
  const discount = await prisma.discountCode.findUnique({ where: { code } });

  if (!discount || !discount.isActive) {
    throw ApiError.badRequest('Invalid discount code');
  }
  if (discount.expiresAt < new Date() || discount.startsAt > new Date()) {
    throw ApiError.badRequest('Discount code has expired');
  }
  if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) {
    throw ApiError.badRequest('Discount code usage limit reached');
  }

  // Per-user limit check
  if (userId) {
    const userUsageCount = await prisma.order.count({
      where: { userId, discountCodeId: discount.id, status: { not: 'CANCELLED' } },
    });
    if (userUsageCount >= discount.perUserLimit) {
      throw ApiError.badRequest(
        'You have already used this discount code the maximum number of times'
      );
    }
  }

  // Applicable products/categories check
  if (discount.applicableProducts.length > 0 && cartProductIds?.length) {
    if (!cartProductIds.some((id) => discount.applicableProducts.includes(id))) {
      throw ApiError.badRequest('This discount code is not applicable to the items in your cart');
    }
  }
  if (discount.applicableCategories.length > 0 && cartCategoryIds?.length) {
    if (!cartCategoryIds.some((id) => discount.applicableCategories.includes(id))) {
      throw ApiError.badRequest('This discount code is not applicable to the items in your cart');
    }
  }

  if (discount.minOrderValue && subtotal < Number(discount.minOrderValue)) {
    throw ApiError.badRequest(`Minimum order value is ₹${discount.minOrderValue}`);
  }

  let discountAmount: number;
  if (discount.type === 'PERCENTAGE') {
    discountAmount = subtotal * (Number(discount.value) / 100);
    if (discount.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
    }
  } else if (discount.type === 'FLAT') {
    // Cap flat discount at subtotal to prevent free orders
    discountAmount = Math.min(Number(discount.value), subtotal);
  } else if (discount.type === 'FREE_SHIPPING') {
    discountAmount = 0;
  } else if (discount.type === 'BUY_X_GET_Y') {
    // BUY_X_GET_Y requires product-level configuration — skip silently for v1
    discountAmount = 0;
  } else {
    discountAmount = 0;
  }

  return discountAmount;
}
