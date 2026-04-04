import crypto from 'crypto';
import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { getRazorpay } from '../config/razorpay';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { APP_CONSTANTS } from '../config/constants';
import { generateOrderNumber } from '@earth-revibe/shared';
import { shiprocketService } from './shiprocket.service';
import { getPostHog } from '../config/posthog';
import { sendMetaEvent } from '../utils/meta-conversions';
import type {
  CreateMagicCheckoutInput,
  ShippingInfoRequest,
  GetPromotionsRequest,
  ApplyPromotionRequest,
  VerifyPaymentInput,
} from '@earth-revibe/shared';

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

    const totalBeforeShipping = Math.max(lineItemsTotal - discountAmount - loyaltyDiscount, 0);
    const orderNumber = generateOrderNumber();

    // Create Razorpay order with line_items for Magic Checkout.
    // Set line_items_total to the DISCOUNTED total so the popup shows the correct price.
    // The actual charge amount also reflects the discount.
    const effectiveTotal = Math.round(totalBeforeShipping * 100); // paise
    const razorpayOrder = await getRazorpay().orders.create({
      amount: effectiveTotal,
      currency: 'INR',
      receipt: orderNumber,
      line_items_total: effectiveTotal, // match amount so popup shows discounted price
      line_items: lineItems,
      notes: {
        userId: userId || 'guest',
        guestEmail: guestEmail || '',
        discountCode: data.discountCode || '',
        discountAmount: String(discountAmount),
        loyaltyPointsToUse: String(isGuest ? 0 : data.loyaltyPointsToUse),
      },
    } as any);

    // Reserve inventory and store pending checkout atomically
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Re-validate prices and reserve stock inside a Serializable transaction
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

          // Decrement stock to reserve
          const result = await tx.productVariant.updateMany({
            where: { id: reqItem.variantId, stock: { gte: reqItem.quantity } },
            data: { stock: { decrement: reqItem.quantity } },
          });
          if (result.count === 0) {
            throw ApiError.conflict(`Stock reservation failed for ${currentVariant.product.name}`);
          }
        }

        // Store pending order data so we can finalize after payment
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

    // Get user info for prefill (or use guest email)
    let prefill = { name: '', email: guestEmail || '', contact: '' };
    if (!isGuest) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, phone: true },
      });
      if (user) {
        // Razorpay Magic Checkout needs +91 format to auto-recognize the user
        // and skip re-asking for phone — avoids the "double login" experience
        let phone = user.phone || '';
        if (phone && !phone.startsWith('+')) phone = `+91${phone}`;
        prefill = {
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          contact: phone,
        };
      }
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
            cod: false,
            cod_fee: 0,
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

    if (!pending) throw ApiError.notFound('Checkout session not found');

    // Security: if an authenticated user is verifying, ensure it matches the pending checkout's userId
    if (userId && pending.userId && pending.userId !== userId) {
      throw ApiError.forbidden('Checkout session does not belong to this user');
    }

    let isGuest = !pending.userId;
    let effectiveUserId = pending.userId;
    let accountAutoCreated = false;

    // Fetch the full Razorpay order — contains customer phone, email, address, shipping fee, promotions
    const rzpOrder = (await getRazorpay().orders.fetch(data.razorpayOrderId)) as any;
    const customerDetails = rzpOrder.customer_details || {};
    const rzpAddress = customerDetails.shipping_address;

    // ──────────────────────────────────────────────
    // 1. Auto-create or link user from Razorpay data
    //    Guest checkout provides phone, email, name — enough to create a user.
    //    If a user with the same email/phone already exists, link to them.
    // ──────────────────────────────────────────────
    const customerEmail = customerDetails.email || pending.guestEmail || '';
    const customerPhone = customerDetails.contact?.replace(/^\+91/, '') || '';
    const customerName =
      rzpAddress?.name || `${rzpAddress?.first_name || ''} ${rzpAddress?.last_name || ''}`.trim();

    if (isGuest && customerEmail) {
      // Try to find existing user by email or phone
      let existingUser = await prisma.user.findUnique({ where: { email: customerEmail } });
      if (!existingUser && customerPhone) {
        existingUser = await prisma.user.findFirst({ where: { phone: customerPhone } });
      }

      if (existingUser) {
        // Link to existing user
        effectiveUserId = existingUser.id;
        isGuest = false;
        logger.info(
          { userId: existingUser.id, email: customerEmail },
          'Guest checkout linked to existing user'
        );

        // Update phone if missing
        if (customerPhone && !existingUser.phone) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { phone: customerPhone },
          });
        }
      } else {
        // Auto-create full account from Razorpay data:
        // Auto-create a Prisma user so they have order history.
        // They can log in later via WhatsApp OTP using their phone number.
        const nameParts = customerName.split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
          const newUser = await prisma.user.create({
            data: {
              email: customerEmail,
              phone: customerPhone ? `+91${customerPhone}` : undefined,
              firstName,
              lastName,
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
            'Auto-created user from Magic Checkout'
          );
        } catch (err) {
          // Unique constraint race — another request may have created the user
          logger.warn(
            { err, email: customerEmail },
            'Failed to auto-create user, continuing as guest'
          );
        }
      }
    } else if (!isGuest && effectiveUserId) {
      // Authenticated user — sync phone if missing
      if (customerPhone) {
        const user = await prisma.user.findUnique({
          where: { id: effectiveUserId },
          select: { phone: true },
        });
        if (!user?.phone) {
          await prisma.user.update({
            where: { id: effectiveUserId },
            data: { phone: customerPhone },
          });
        }
      }
    }

    // ──────────────────────────────────────────────
    // 2. Save shipping address
    // ──────────────────────────────────────────────
    let addressId: string;

    if (rzpAddress) {
      const pinCode = rzpAddress.zipcode || rzpAddress.zip_code || '';
      const line1 = rzpAddress.line1 || rzpAddress.address || '';
      const fullName =
        rzpAddress.name || `${rzpAddress.first_name || ''} ${rzpAddress.last_name || ''}`.trim();
      const phone = customerDetails.contact || '';

      if (!isGuest && effectiveUserId) {
        // For authenticated users, check for existing address to avoid duplicates
        const existingAddr = await prisma.address.findFirst({
          where: { userId: effectiveUserId, pinCode, line1 },
        });

        if (existingAddr) {
          addressId = existingAddr.id;
        } else {
          const addressCount = await prisma.address.count({ where: { userId: effectiveUserId } });
          const address = await prisma.address.create({
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
        // For guest users, create an address without a user link
        const address = await prisma.address.create({
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
        // Fallback: get user's default address
        const defaultAddr = await prisma.address.findFirst({
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

    // ──────────────────────────────────────────────
    // 3. Build order items from stored cart data
    // ──────────────────────────────────────────────
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

    // ──────────────────────────────────────────────
    // 4. Calculate totals
    // ──────────────────────────────────────────────
    const discountAmount = Number(pending.discountAmount);
    const loyaltyDiscount = Number(pending.loyaltyDiscount);
    const shippingAmount = 0;
    const totalAmount = Math.max(subtotal - discountAmount - loyaltyDiscount + shippingAmount, 0);

    // Find discount code ID if applicable
    let discountCodeId: string | null = null;
    if (pending.discountCode) {
      const dc = await prisma.discountCode.findUnique({ where: { code: pending.discountCode } });
      discountCodeId = dc?.id || null;
    }

    // Resolve the guest email (from pending checkout or Razorpay customer details)
    const guestEmail = pending.guestEmail || customerDetails.email || null;

    // Wrap all DB writes in a transaction for data integrity
    const {
      orderId,
      orderNumber: finalOrderNumber,
      pointsEarned,
    } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create order in DB
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
              razorpayOrderId: data.razorpayOrderId,
              razorpayPaymentId: data.razorpayPaymentId,
              razorpaySignature: data.razorpaySignature,
              amount: totalAmount,
              status: 'CAPTURED',
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

      // Update discount usage count
      if (discountCodeId) {
        await tx.discountCode.update({
          where: { id: discountCodeId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Stock was already reserved during createMagicOrder (Serializable transaction).
      // If somehow stock was NOT reserved (legacy pending checkouts), deduct now.
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

      // Loyalty points and referrals — only for authenticated users
      let pointsEarned = 0;
      if (!isGuest && effectiveUserId) {
        // Deduct loyalty points
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

        // Earn loyalty points (1 per 100)
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

        // Handle referral (first purchase)
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

        // Clear cart
        const cart = await tx.cart.findUnique({ where: { userId: effectiveUserId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      }

      // Clean up pending checkout
      await tx.pendingCheckout.delete({ where: { id: pending.id } });

      return { orderId: order.id, orderNumber: pending.orderNumber, pointsEarned };
    });

    // Auto-create Shiprocket shipment (non-blocking, outside transaction)
    shiprocketService.createShiprocketOrder(orderId).catch((err) => {
      logger.error({ err, orderId }, 'Failed to create Shiprocket shipment');
    });

    // Server-side PostHog purchase tracking (guaranteed — doesn't depend on client JS)
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

    // Meta Conversions API — server-side Purchase event (bypasses ad blockers)
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
  },
};

/**
 * Restore reserved stock for expired/failed pending checkouts.
 * Called by the cleanup endpoint.
 */
export async function restoreExpiredReservations(): Promise<number> {
  const twoHoursAgo = new Date(Date.now() - APP_CONSTANTS.CHECKOUT_EXPIRY_MS);

  const expiredCheckouts = await prisma.pendingCheckout.findMany({
    where: {
      createdAt: { lt: twoHoursAgo },
      stockReserved: true,
    },
  });

  let restoredCount = 0;

  for (const checkout of expiredCheckouts) {
    const cartItems: { variantId: string; quantity: number }[] = JSON.parse(checkout.itemsJson);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Restore stock for each reserved item
      for (const item of cartItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Delete the expired pending checkout
      await tx.pendingCheckout.delete({ where: { id: checkout.id } });
    });

    restoredCount++;
  }

  return restoredCount;
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
  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
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
