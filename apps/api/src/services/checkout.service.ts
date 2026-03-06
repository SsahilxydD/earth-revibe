import crypto from "crypto";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import { razorpay } from "../config/razorpay";
import { env } from "../config/env";
import { generateOrderNumber } from "@earth-revibe/shared";
import { shiprocketService } from "./shiprocket.service";
import type {
  CreateMagicCheckoutInput,
  ShippingInfoRequest,
  GetPromotionsRequest,
  ApplyPromotionRequest,
  VerifyPaymentInput,
} from "@earth-revibe/shared";

export const checkoutService = {
  /**
   * Create a Razorpay order with line_items for Magic Checkout.
   * We don't require an address — Magic Checkout collects it.
   */
  async createMagicOrder(userId: string, data: CreateMagicCheckoutInput) {
    // Fetch variants with product data
    const variantIds = data.items.map((i: { variantId: string }) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: { id: true, name: true, slug: true, price: true, images: { where: { isPrimary: true }, take: 1 } },
        },
      },
    });

    if (variants.length !== variantIds.length) {
      throw ApiError.badRequest("One or more items are no longer available");
    }

    // Check stock and build line items
    const lineItems: any[] = [];
    let lineItemsTotal = 0;

    for (const reqItem of data.items) {
      const variant = variants.find((v) => v.id === reqItem.variantId);
      if (!variant) throw ApiError.badRequest(`Variant ${reqItem.variantId} not found`);
      if (variant.stock < reqItem.quantity) {
        throw ApiError.badRequest(`${variant.product.name} (${variant.size}) only has ${variant.stock} in stock`);
      }

      const unitPrice = Number(variant.price) || Number(variant.product.price);
      const itemTotal = unitPrice * reqItem.quantity;
      lineItemsTotal += itemTotal;

      lineItems.push({
        type: "e-commerce",
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

    // Apply discount if provided
    let discountAmount = 0;
    if (data.discountCode) {
      discountAmount = await calculateDiscount(data.discountCode, lineItemsTotal);
    }

    // Apply loyalty points
    let loyaltyDiscount = 0;
    if (data.loyaltyPointsToUse > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < data.loyaltyPointsToUse) {
        throw ApiError.badRequest("Insufficient loyalty points");
      }
      loyaltyDiscount = data.loyaltyPointsToUse;
    }

    const totalBeforeShipping = Math.max(lineItemsTotal - discountAmount - loyaltyDiscount, 0);
    const orderNumber = generateOrderNumber();

    // Create Razorpay order with line_items for Magic Checkout
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalBeforeShipping * 100), // paise — shipping added by Razorpay via shipping-info API
      currency: "INR",
      receipt: orderNumber,
      line_items_total: Math.round(lineItemsTotal * 100),
      line_items: lineItems,
      notes: {
        userId,
        discountCode: data.discountCode || "",
        loyaltyPointsToUse: String(data.loyaltyPointsToUse),
      },
    } as any);

    // Store pending order data so we can finalize after payment
    // We use a lightweight "pending checkout" record
    await prisma.pendingCheckout.create({
      data: {
        orderNumber,
        userId,
        razorpayOrderId: razorpayOrder.id,
        discountCode: data.discountCode || null,
        loyaltyPointsToUse: data.loyaltyPointsToUse,
        subtotal: lineItemsTotal,
        discountAmount,
        loyaltyDiscount,
        itemsJson: JSON.stringify(data.items),
      },
    });

    // Get user info for prefill
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, phone: true },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      amount: totalBeforeShipping,
      orderNumber,
      prefill: {
        name: user ? `${user.firstName} ${user.lastName}`.trim() : "",
        email: user?.email || "",
        contact: user?.phone || "",
      },
    };
  },

  /**
   * Called by Razorpay's servers to get shipping info for addresses.
   */
  async getShippingInfo(data: ShippingInfoRequest) {
    const addresses = data.addresses.map((addr: { id: string; zipcode: string; country: string; state_code?: string }) => ({
      id: addr.id,
      zipcode: addr.zipcode,
      country: addr.country,
      shipping_methods: [
        {
          id: "standard",
          name: "Free Delivery",
          description: "5-7 business days",
          serviceable: addr.country === "IN",
          shipping_fee: 0,
          cod: false,
          cod_fee: 0,
        },
      ],
    }));

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
      orderBy: { createdAt: "desc" },
    });

    const promotions = discounts.map((d) => ({
      code: d.code,
      summary: d.type === "PERCENTAGE"
        ? `${d.value}% off${d.maxDiscountAmount ? ` (up to ₹${d.maxDiscountAmount})` : ""}`
        : `₹${d.value} off`,
      description: d.minOrderValue
        ? `Min order ₹${d.minOrderValue}`
        : "No minimum order",
    }));

    return { promotions };
  },

  /**
   * Called by Razorpay when customer applies a promotion code.
   */
  async applyPromotion(data: ApplyPromotionRequest) {
    const pending = await prisma.pendingCheckout.findUnique({
      where: { orderNumber: data.order_id },
    });

    if (!pending) {
      return { error: { code: "INVALID_PROMOTION", message: "Order not found" } };
    }

    const subtotal = Number(pending.subtotal);

    try {
      const discountAmount = await calculateDiscount(data.code, subtotal);

      return {
        promotion: {
          reference_id: data.code,
          code: data.code,
          type: "coupon",
          value: Math.round(discountAmount * 100), // paise
          value_type: "fixed_amount",
          description: `Discount code ${data.code} applied`,
        },
      };
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Invalid code";
      return {
        error: { code: "INVALID_PROMOTION", message },
      };
    }
  },

  /**
   * Verify Magic Checkout payment and create the final order.
   * Syncs customer data (phone, email, address) from Razorpay back to our DB.
   */
  async verifyMagicPayment(userId: string, data: VerifyPaymentInput) {
    // Verify HMAC signature
    const body = data.razorpayOrderId + "|" + data.razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== data.razorpaySignature) {
      throw ApiError.badRequest("Payment verification failed");
    }

    // Find the pending checkout
    const pending = await prisma.pendingCheckout.findFirst({
      where: { razorpayOrderId: data.razorpayOrderId, userId },
    });

    if (!pending) throw ApiError.notFound("Checkout session not found");

    // Fetch the full Razorpay order — contains customer phone, email, address, shipping fee, promotions
    const rzpOrder = await razorpay.orders.fetch(data.razorpayOrderId) as any;
    const customerDetails = rzpOrder.customer_details || {};
    const rzpAddress = customerDetails.shipping_address;

    // ──────────────────────────────────────────────
    // 1. Sync customer contact info back to user profile
    // ──────────────────────────────────────────────
    const customerPhone = customerDetails.contact?.replace(/^\+91/, "") || "";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });

    // Update phone if user doesn't have one yet (Razorpay captured it)
    if (customerPhone && (!user?.phone)) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone: customerPhone },
      });
    }

    // ──────────────────────────────────────────────
    // 2. Save shipping address — avoid duplicates by matching pinCode + line1
    // ──────────────────────────────────────────────
    let addressId: string;

    if (rzpAddress) {
      const pinCode = rzpAddress.zipcode || rzpAddress.zip_code || "";
      const line1 = rzpAddress.line1 || rzpAddress.address || "";
      const fullName = rzpAddress.name || `${rzpAddress.first_name || ""} ${rzpAddress.last_name || ""}`.trim();
      const phone = customerDetails.contact || "";

      // Check if we already have this address (same pincode + first line)
      const existingAddr = await prisma.address.findFirst({
        where: { userId, pinCode, line1 },
      });

      if (existingAddr) {
        addressId = existingAddr.id;
      } else {
        // First address for this user? Make it default
        const addressCount = await prisma.address.count({ where: { userId } });

        const address = await prisma.address.create({
          data: {
            userId,
            label: rzpAddress.tag || "Home",
            fullName,
            phone,
            line1,
            line2: rzpAddress.line2 || "",
            city: rzpAddress.city || "",
            state: rzpAddress.state || "",
            pinCode,
            isDefault: addressCount === 0,
          },
        });
        addressId = address.id;
      }
    } else {
      // Fallback: get user's default address
      const defaultAddr = await prisma.address.findFirst({
        where: { userId, isDefault: true },
      });
      if (!defaultAddr) {
        throw ApiError.badRequest("No shipping address found");
      }
      addressId = defaultAddr.id;
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
    // 4. Use Razorpay's actual shipping fee (from shipping-info callback)
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

    // Create order in DB
    const order = await prisma.order.create({
      data: {
        orderNumber: pending.orderNumber,
        userId,
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
            status: "CAPTURED",
            paidAt: new Date(),
          },
        },
        status: "CONFIRMED",
        statusHistory: {
          create: { status: "CONFIRMED", note: "Payment received via Magic Checkout" },
        },
      },
    });

    // Update discount usage count
    if (discountCodeId) {
      await prisma.discountCode.update({
        where: { id: discountCodeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Deduct stock
    for (const ci of cartItems) {
      await prisma.productVariant.update({
        where: { id: ci.variantId },
        data: { stock: { decrement: ci.quantity } },
      });
    }

    // Deduct loyalty points
    if (pending.loyaltyPointsToUse > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: pending.loyaltyPointsToUse } },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: "REDEEMED",
          points: -pending.loyaltyPointsToUse,
          description: `Redeemed for order #${pending.orderNumber}`,
          orderId: order.id,
        },
      });
    }

    // Earn loyalty points (1 per ₹100)
    const pointsEarned = Math.floor(totalAmount / 100);
    if (pointsEarned > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { loyaltyPointsEarned: pointsEarned },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: "EARNED",
          points: pointsEarned,
          description: `Earned from order #${pending.orderNumber}`,
          orderId: order.id,
        },
      });
    }

    // Handle referral (first purchase)
    const orderCount = await prisma.order.count({
      where: { userId, status: { not: "CANCELLED" } },
    });
    if (orderCount === 1) {
      const referral = await prisma.referral.findUnique({ where: { refereeId: userId } });
      if (referral && referral.status === "SIGNED_UP") {
        const REFERRER_REWARD = 100;
        const REFEREE_REWARD = 50;
        await prisma.referral.update({
          where: { id: referral.id },
          data: { status: "CONVERTED", referrerReward: REFERRER_REWARD, refereeReward: REFEREE_REWARD },
        });
        await prisma.user.update({ where: { id: referral.referrerId }, data: { loyaltyPoints: { increment: REFERRER_REWARD } } });
        await prisma.loyaltyTransaction.create({
          data: { userId: referral.referrerId, type: "BONUS", points: REFERRER_REWARD, description: "Referral reward - friend made first purchase" },
        });
        await prisma.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: REFEREE_REWARD } } });
        await prisma.loyaltyTransaction.create({
          data: { userId, type: "BONUS", points: REFEREE_REWARD, description: "Welcome bonus - first purchase reward" },
        });
      }
    }

    // Clear cart
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    // Clean up pending checkout
    await prisma.pendingCheckout.delete({ where: { id: pending.id } });

    // Auto-create Shiprocket shipment (non-blocking — don't fail the order if Shiprocket is down)
    shiprocketService.createShiprocketOrder(order.id).catch((err) => {
      console.error(`[Shiprocket] Failed to create shipment for order ${order.id}:`, err);
    });

    return { orderNumber: pending.orderNumber, pointsEarned };
  },
};

/** Helper: calculate discount amount for a given code and subtotal */
async function calculateDiscount(code: string, subtotal: number): Promise<number> {
  const discount = await prisma.discountCode.findUnique({ where: { code } });

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

  let discountAmount: number;
  if (discount.type === "PERCENTAGE") {
    discountAmount = subtotal * (Number(discount.value) / 100);
    if (discount.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
    }
  } else {
    discountAmount = Number(discount.value);
  }

  return discountAmount;
}
