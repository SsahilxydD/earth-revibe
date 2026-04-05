import crypto from 'crypto';
import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { getRazorpay } from '../config/razorpay';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { APP_CONSTANTS } from '../config/constants';
import { generateOrderNumber } from '@earth-revibe/shared';
import { shiprocketService } from './shiprocket.service';
import type {
  CreateOrderInput,
  VerifyPaymentInput,
  OrderQuery,
  CancelOrderInput,
} from '@earth-revibe/shared';

export const orderService = {
  async createOrder(userId: string, data: CreateOrderInput) {
    // Get user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    categoryId: true,
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest('Cart is empty');
    }

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });
    if (!address) throw ApiError.badRequest('Invalid address');

    // Calculate subtotal
    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      const unitPrice = Number(item.variant.price) || Number(item.variant.product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        productName: item.variant.product.name,
        productImage: item.variant.product.images[0]?.url || null,
        variantSize: item.variant.size,
        variantColor: item.variant.color,
      };
    });

    // Collect product/category IDs for discount applicability check
    const cartProductIds = cart.items.map((item) => item.variant.product.id);
    const cartCategoryIds = cart.items.map((item) => item.variant.product.categoryId);

    // Apply discount code if provided
    let discountAmount = 0;
    let discountCodeId: string | null = null;

    if (data.discountCode) {
      const discount = await prisma.discountCode.findUnique({
        where: { code: data.discountCode },
      });

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
      const userUsageCount = await prisma.order.count({
        where: { userId, discountCodeId: discount.id, status: { not: 'CANCELLED' } },
      });
      if (userUsageCount >= discount.perUserLimit) {
        throw ApiError.badRequest(
          'You have already used this discount code the maximum number of times'
        );
      }

      // Applicable products/categories check
      if (discount.applicableProducts.length > 0) {
        const hasApplicableProduct = cartProductIds.some((id) =>
          discount.applicableProducts.includes(id)
        );
        if (!hasApplicableProduct) {
          throw ApiError.badRequest(
            'This discount code is not applicable to the items in your cart'
          );
        }
      }
      if (discount.applicableCategories.length > 0) {
        const hasApplicableCategory = cartCategoryIds.some((id) =>
          discount.applicableCategories.includes(id)
        );
        if (!hasApplicableCategory) {
          throw ApiError.badRequest(
            'This discount code is not applicable to the items in your cart'
          );
        }
      }

      if (discount.minOrderValue && subtotal < Number(discount.minOrderValue)) {
        throw ApiError.badRequest(`Minimum order value is ₹${discount.minOrderValue}`);
      }

      // Calculate discount — handle all types
      if (discount.type === 'PERCENTAGE') {
        discountAmount = subtotal * (Number(discount.value) / 100);
        if (discount.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
        }
      } else if (discount.type === 'FLAT') {
        // Cap flat discount at subtotal to prevent free orders
        discountAmount = Math.min(Number(discount.value), subtotal);
      } else if (discount.type === 'FREE_SHIPPING') {
        // Shipping is already free; discount amount stays 0
        discountAmount = 0;
      } else if (discount.type === 'BUY_X_GET_Y') {
        // BUY_X_GET_Y requires product-level configuration — skip silently for v1
        discountAmount = 0;
      }

      discountCodeId = discount.id;
    }

    // Apply loyalty points
    let loyaltyDiscount = 0;
    if (data.loyaltyPointsToUse > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < data.loyaltyPointsToUse) {
        throw ApiError.badRequest('Insufficient loyalty points');
      }

      // Check minimum redemption threshold from LoyaltyConfig
      const loyaltyConfig = await prisma.loyaltyConfig.findFirst({ where: { isActive: true } });
      if (loyaltyConfig && data.loyaltyPointsToUse < loyaltyConfig.minRedeemPoints) {
        throw ApiError.badRequest(
          `Minimum ${loyaltyConfig.minRedeemPoints} points required for redemption`
        );
      }

      // Cap loyalty discount at remaining amount after discount
      const maxLoyaltyDiscount = Math.max(subtotal - discountAmount, 0);
      loyaltyDiscount = Math.min(data.loyaltyPointsToUse, maxLoyaltyDiscount);
    }

    // Calculate totals
    const shippingAmount = 0;
    const totalBeforeTax = subtotal - discountAmount - loyaltyDiscount + shippingAmount;
    const taxAmount = 0; // Inclusive pricing, no additional tax
    const totalAmount = Math.max(totalBeforeTax + taxAmount, 0);

    const orderNumber = generateOrderNumber();

    // Create Razorpay order
    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(totalAmount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: orderNumber,
    });

    // Wrap DB writes in a Serializable transaction for atomicity + consistency
    const order = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Re-validate prices and stock inside transaction to prevent stale-data races
        for (const item of cart.items) {
          const currentVariant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { price: true, stock: true, product: { select: { price: true, name: true } } },
          });
          if (!currentVariant) {
            throw ApiError.badRequest(`Product variant is no longer available`);
          }
          const currentPrice = Number(currentVariant.price) || Number(currentVariant.product.price);
          const cartPrice = Number(item.variant.price) || Number(item.variant.product.price);
          if (currentPrice !== cartPrice) {
            throw ApiError.conflict(
              `Price changed for ${currentVariant.product.name}. Please refresh your cart.`
            );
          }
          if (currentVariant.stock < item.quantity) {
            throw ApiError.conflict(
              `Insufficient stock for ${currentVariant.product.name}. Only ${currentVariant.stock} available.`
            );
          }
        }

        // Reserve stock by decrementing inside the transaction
        for (const item of cart.items) {
          const result = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw ApiError.conflict(`Stock reservation failed for variant ${item.variantId}`);
          }
        }

        // Atomically increment discount usage inside transaction for consistency
        if (discountCodeId) {
          await tx.discountCode.update({
            where: { id: discountCodeId },
            data: { usageCount: { increment: 1 } },
          });
        }

        // Create order in DB
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            addressId: data.addressId,
            subtotal,
            discountAmount,
            shippingAmount,
            taxAmount,
            totalAmount,
            loyaltyPointsUsed: loyaltyDiscount,
            discountCodeId,
            items: {
              create: orderItems,
            },
            payment: {
              create: {
                razorpayOrderId: razorpayOrder.id,
                amount: totalAmount,
                status: 'PENDING',
              },
            },
            statusHistory: {
              create: {
                status: 'PLACED',
                note: 'Order placed, awaiting payment',
              },
            },
          },
          include: {
            items: true,
            payment: true,
          },
        });

        return createdOrder;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return {
      order,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID ?? '',
      amount: totalAmount,
    };
  },

  async verifyPayment(userId: string, data: VerifyPaymentInput) {
    // Find the payment (scoped to user's order)
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: data.razorpayOrderId, order: { userId } },
      include: { order: true },
    });

    if (!payment) throw ApiError.notFound('Payment not found');

    // Verify signature
    if (!env.RAZORPAY_KEY_SECRET) {
      throw ApiError.badRequest('Razorpay is not configured');
    }
    const body = data.razorpayOrderId + '|' + data.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Guard against mismatched buffer lengths (timingSafeEqual throws on length mismatch)
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const receivedBuf = Buffer.from(data.razorpaySignature, 'hex');
    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: 'Signature verification failed' },
      });
      throw ApiError.badRequest('Payment verification failed');
    }

    // Wrap all post-verification writes in a transaction for data integrity
    const { orderNumber, pointsEarned } = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: data.razorpayPaymentId,
            razorpaySignature: data.razorpaySignature,
            status: 'CAPTURED',
            paidAt: new Date(),
          },
        });

        // Update order status
        await tx.order.update({
          where: { id: payment.order.id },
          data: { status: 'CONFIRMED' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.order.id,
            status: 'CONFIRMED',
            note: 'Payment received',
          },
        });

        // Stock was already decremented at order creation time (Serializable transaction).
        // No stock deduction needed here — payment verification only confirms the charge.

        // Deduct loyalty points if used
        if (payment.order.loyaltyPointsUsed > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { decrement: payment.order.loyaltyPointsUsed } },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId,
              type: 'REDEEMED',
              points: -payment.order.loyaltyPointsUsed,
              description: `Redeemed for order #${payment.order.orderNumber}`,
              orderId: payment.order.id,
            },
          });
        }

        // Earn loyalty points (1 point per ₹100 spent)
        const pointsEarned = Math.floor(Number(payment.order.totalAmount) / 100);
        if (pointsEarned > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
          await tx.order.update({
            where: { id: payment.order.id },
            data: { loyaltyPointsEarned: pointsEarned },
          });
          await tx.loyaltyTransaction.create({
            data: {
              userId,
              type: 'EARNED',
              points: pointsEarned,
              description: `Earned from order #${payment.order.orderNumber}`,
              orderId: payment.order.id,
            },
          });
        }

        // Handle referral conversion (first purchase by referred user)
        const orderCount = await tx.order.count({
          where: { userId, status: { not: 'CANCELLED' } },
        });
        if (orderCount === 1) {
          const referral = await tx.referral.findUnique({
            where: { refereeId: userId },
          });
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

        // Clear cart
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }

        return { orderNumber: payment.order.orderNumber, pointsEarned };
      }
    );

    // Auto-create Shiprocket shipment (non-blocking, outside transaction)
    shiprocketService.createShiprocketOrder(payment.order.id).catch((err) => {
      logger.error({ err, orderId: payment.order.id }, 'Failed to create Shiprocket shipment');
    });

    return { orderNumber, pointsEarned };
  },

  async listOrders(userId: string, query: OrderQuery) {
    const { status, page, limit } = query;
    const where: Prisma.OrderWhereInput = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOrder(userId: string, orderNumber: string) {
    const order = await prisma.order.findFirst({
      where: { orderNumber, userId },
      include: {
        items: true,
        payment: true,
        address: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        discountCode: { select: { code: true, type: true, value: true } },
      },
    });

    if (!order) throw ApiError.notFound('Order not found');

    return order;
  },

  async cancelOrder(userId: string, orderNumber: string, data: CancelOrderInput) {
    const order = await prisma.order.findFirst({
      where: { orderNumber, userId },
      include: { payment: true },
    });

    if (!order) throw ApiError.notFound('Order not found');

    const cancellableStatuses = ['PLACED', 'CONFIRMED', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.status)) {
      throw ApiError.badRequest('Order cannot be cancelled at this stage');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          note: data.reason,
          changedBy: userId,
        },
      });

      // Restore stock
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Restore loyalty points if used
      if (order.loyaltyPointsUsed > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: order.loyaltyPointsUsed } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'ADJUSTED',
            points: order.loyaltyPointsUsed,
            description: `Points restored from cancelled order #${order.orderNumber}`,
            orderId: order.id,
          },
        });
      }

      // Claw back earned loyalty points
      if (order.loyaltyPointsEarned > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { decrement: order.loyaltyPointsEarned } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'ADJUSTED',
            points: -order.loyaltyPointsEarned,
            description: `Points reversed from cancelled order #${order.orderNumber}`,
            orderId: order.id,
          },
        });
      }

      // Claw back referral rewards if this was the referred user's first purchase
      const referral = await tx.referral.findUnique({
        where: { refereeId: userId },
      });
      if (referral && referral.status === 'CONVERTED') {
        // Check if user has any other non-cancelled orders
        const otherOrders = await tx.order.count({
          where: { userId, status: { not: 'CANCELLED' }, id: { not: order.id } },
        });
        if (otherOrders === 0) {
          // Revert referral status and claw back rewards
          const referrerReward = referral.referrerReward || 0;
          const refereeReward = referral.refereeReward || 0;

          await tx.referral.update({
            where: { id: referral.id },
            data: { status: 'SIGNED_UP', referrerReward: 0, refereeReward: 0 },
          });

          if (referrerReward > 0) {
            await tx.user.update({
              where: { id: referral.referrerId },
              data: { loyaltyPoints: { decrement: referrerReward } },
            });
            await tx.loyaltyTransaction.create({
              data: {
                userId: referral.referrerId,
                type: 'ADJUSTED',
                points: -referrerReward,
                description: `Referral reward reversed - referred user cancelled order #${order.orderNumber}`,
              },
            });
          }

          if (refereeReward > 0) {
            await tx.user.update({
              where: { id: userId },
              data: { loyaltyPoints: { decrement: refereeReward } },
            });
            await tx.loyaltyTransaction.create({
              data: {
                userId,
                type: 'ADJUSTED',
                points: -refereeReward,
                description: `Welcome bonus reversed - order #${order.orderNumber} cancelled`,
              },
            });
          }
        }
      }

      // Initiate Razorpay refund if payment was captured
      if (order.payment && order.payment.status === 'CAPTURED' && order.payment.razorpayPaymentId) {
        try {
          const refundAmountInPaise = Math.round(Number(order.payment.amount) * 100);
          const refundResult = await getRazorpay().payments.refund(
            order.payment.razorpayPaymentId,
            {
              amount: refundAmountInPaise,
              notes: { reason: data.reason, orderNumber },
            }
          );

          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: 'REFUNDED',
              refundId: refundResult.id,
              refundAmount: Number(order.payment.amount),
            },
          });
        } catch (refundErr) {
          // Log but don't fail the cancellation — admin can manually refund
          logger.error({ err: refundErr, orderNumber }, 'Failed to auto-refund order');
        }
      }

      return { orderNumber: order.orderNumber };
    });
  },
};
