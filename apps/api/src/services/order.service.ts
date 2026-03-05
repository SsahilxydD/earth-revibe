import crypto from "crypto";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import { razorpay } from "../config/razorpay";
import { env } from "../config/env";
import { generateOrderNumber } from "@earth-revibe/shared";
import type { CreateOrderInput, VerifyPaymentInput, OrderQuery, CancelOrderInput } from "@earth-revibe/shared";

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
                  select: { id: true, name: true, price: true, images: { where: { isPrimary: true }, take: 1 } },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw ApiError.badRequest("Cart is empty");
    }

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });
    if (!address) throw ApiError.badRequest("Invalid address");

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

    // Apply discount code if provided
    let discountAmount = 0;
    let discountCodeId: string | null = null;

    if (data.discountCode) {
      const discount = await prisma.discountCode.findUnique({
        where: { code: data.discountCode },
      });

      if (!discount || !discount.isActive) {
        throw ApiError.badRequest("Invalid discount code");
      }

      if (discount.expiresAt < new Date() || discount.startsAt > new Date()) {
        throw ApiError.badRequest("Discount code has expired");
      }

      if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
        throw ApiError.badRequest("Discount code usage limit reached");
      }

      if (discount.minOrderValue && subtotal < Number(discount.minOrderValue)) {
        throw ApiError.badRequest(`Minimum order value is ₹${discount.minOrderValue}`);
      }

      // Calculate discount
      if (discount.type === "PERCENTAGE") {
        discountAmount = subtotal * (Number(discount.value) / 100);
        if (discount.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
        }
      } else {
        discountAmount = Number(discount.value);
      }

      discountCodeId = discount.id;
    }

    // Apply loyalty points
    let loyaltyDiscount = 0;
    if (data.loyaltyPointsToUse > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < data.loyaltyPointsToUse) {
        throw ApiError.badRequest("Insufficient loyalty points");
      }
      // 1 point = ₹1
      loyaltyDiscount = data.loyaltyPointsToUse;
    }

    // Calculate totals
    const shippingAmount = subtotal >= 999 ? 0 : 99; // Free shipping over ₹999
    const totalBeforeTax = subtotal - discountAmount - loyaltyDiscount + shippingAmount;
    const taxAmount = 0; // Inclusive pricing, no additional tax
    const totalAmount = Math.max(totalBeforeTax + taxAmount, 0);

    const orderNumber = generateOrderNumber();

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // Razorpay expects paise
      currency: "INR",
      receipt: orderNumber,
    });

    // Create order in DB
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        addressId: data.addressId,
        subtotal,
        discountAmount,
        shippingAmount,
        taxAmount,
        totalAmount,
        loyaltyPointsUsed: data.loyaltyPointsToUse,
        discountCodeId,
        items: {
          create: orderItems,
        },
        payment: {
          create: {
            razorpayOrderId: razorpayOrder.id,
            amount: totalAmount,
            status: "PENDING",
          },
        },
        statusHistory: {
          create: {
            status: "PLACED",
            note: "Order placed, awaiting payment",
          },
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    // Update discount usage count
    if (discountCodeId) {
      await prisma.discountCode.update({
        where: { id: discountCodeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return {
      order,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: totalAmount,
    };
  },

  async verifyPayment(userId: string, data: VerifyPaymentInput) {
    // Find the payment
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: data.razorpayOrderId },
      include: { order: true },
    });

    if (!payment) throw ApiError.notFound("Payment not found");
    if (payment.order.userId !== userId) throw ApiError.forbidden("Not your order");

    // Verify signature
    const body = data.razorpayOrderId + "|" + data.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== data.razorpaySignature) {
      // Mark payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failureReason: "Signature verification failed" },
      });
      throw ApiError.badRequest("Payment verification failed");
    }

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
        status: "CAPTURED",
        paidAt: new Date(),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payment.order.id },
      data: { status: "CONFIRMED" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: payment.order.id,
        status: "CONFIRMED",
        note: "Payment received",
      },
    });

    // Deduct stock
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: payment.order.id },
    });
    for (const item of orderItems) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Deduct loyalty points if used
    if (payment.order.loyaltyPointsUsed > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: payment.order.loyaltyPointsUsed } },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: "REDEEMED",
          points: -payment.order.loyaltyPointsUsed,
          description: `Redeemed for order #${payment.order.orderNumber}`,
          orderId: payment.order.id,
        },
      });
    }

    // Earn loyalty points (1 point per ₹100 spent)
    const pointsEarned = Math.floor(Number(payment.order.totalAmount) / 100);
    if (pointsEarned > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });
      await prisma.order.update({
        where: { id: payment.order.id },
        data: { loyaltyPointsEarned: pointsEarned },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: "EARNED",
          points: pointsEarned,
          description: `Earned from order #${payment.order.orderNumber}`,
          orderId: payment.order.id,
        },
      });
    }

    // Handle referral conversion (first purchase by referred user)
    const orderCount = await prisma.order.count({
      where: { userId, status: { not: "CANCELLED" } },
    });
    if (orderCount === 1) {
      const referral = await prisma.referral.findUnique({
        where: { refereeId: userId },
      });
      if (referral && referral.status === "SIGNED_UP") {
        const REFERRER_REWARD = 100;
        const REFEREE_REWARD = 50;

        await prisma.referral.update({
          where: { id: referral.id },
          data: {
            status: "CONVERTED",
            referrerReward: REFERRER_REWARD,
            refereeReward: REFEREE_REWARD,
          },
        });

        await prisma.user.update({
          where: { id: referral.referrerId },
          data: { loyaltyPoints: { increment: REFERRER_REWARD } },
        });
        await prisma.loyaltyTransaction.create({
          data: {
            userId: referral.referrerId,
            type: "BONUS",
            points: REFERRER_REWARD,
            description: "Referral reward - friend made first purchase",
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: REFEREE_REWARD } },
        });
        await prisma.loyaltyTransaction.create({
          data: {
            userId,
            type: "BONUS",
            points: REFEREE_REWARD,
            description: "Welcome bonus - first purchase reward",
          },
        });
      }
    }

    // Clear cart
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return { orderNumber: payment.order.orderNumber, pointsEarned };
  },

  async listOrders(userId: string, query: OrderQuery) {
    const { status, page, limit } = query;
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      }),
      prisma.order.count({ where: where as any }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOrder(userId: string, orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: true,
        address: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        discountCode: { select: { code: true, type: true, value: true } },
      },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.userId !== userId) throw ApiError.forbidden("Not your order");

    return order;
  },

  async cancelOrder(userId: string, orderNumber: string, data: CancelOrderInput) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.userId !== userId) throw ApiError.forbidden("Not your order");

    const cancellableStatuses = ["PLACED", "CONFIRMED", "PROCESSING"];
    if (!cancellableStatuses.includes(order.status)) {
      throw ApiError.badRequest("Order cannot be cancelled at this stage");
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "CANCELLED",
        note: data.reason,
        changedBy: userId,
      },
    });

    // Restore stock
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of items) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // Restore loyalty points if used
    if (order.loyaltyPointsUsed > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: order.loyaltyPointsUsed } },
      });
    }

    // TODO: Initiate refund via Razorpay if payment was captured

    return { orderNumber: order.orderNumber };
  },
};
