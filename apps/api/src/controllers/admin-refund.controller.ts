import type { Request, Response } from "express";
import { prisma } from "@earth-revibe/db";
import { razorpay } from "../config/razorpay";
import { ApiError } from "../utils/api-error";

export const adminRefundController = {
  async initiateRefund(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const { amount, reason } = req.body as { amount?: number; reason: string };

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw ApiError.badRequest("Refund reason is required");
    }

    // Find order with payment and items
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        payment: true,
        items: true,
      },
    });

    if (!order) {
      throw ApiError.notFound("Order not found");
    }

    if (!order.payment) {
      throw ApiError.badRequest("No payment found for this order");
    }

    if (order.payment.status !== "CAPTURED") {
      throw ApiError.badRequest(
        `Cannot refund a payment with status "${order.payment.status}". Only captured payments can be refunded.`
      );
    }

    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      throw ApiError.badRequest(
        `Cannot refund an order with status "${order.status}"`
      );
    }

    if (!order.payment.razorpayPaymentId) {
      throw ApiError.badRequest(
        "No Razorpay payment ID found. Cannot process refund."
      );
    }

    // Calculate refund amount (in paise for Razorpay)
    const paymentAmountInPaise = Math.round(Number(order.payment.amount) * 100);
    const refundAmountInPaise = amount
      ? Math.round(amount * 100)
      : paymentAmountInPaise;

    if (refundAmountInPaise <= 0) {
      throw ApiError.badRequest("Refund amount must be greater than zero");
    }

    if (refundAmountInPaise > paymentAmountInPaise) {
      throw ApiError.badRequest(
        "Refund amount cannot exceed the payment amount"
      );
    }

    // Issue refund via Razorpay
    const refundResult = await razorpay.payments.refund(
      order.payment.razorpayPaymentId,
      {
        amount: refundAmountInPaise,
        notes: { reason: reason.trim(), orderNumber },
      }
    );

    const refundAmountDecimal = refundAmountInPaise / 100;
    const isFullRefund = refundAmountInPaise === paymentAmountInPaise;

    // Wrap all DB writes in a transaction for data integrity
    await prisma.$transaction(async (tx) => {
      // Update payment record
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
          refundId: refundResult.id,
          refundAmount: refundAmountDecimal,
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });

      // Create order status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "REFUNDED",
          note: `Refund of ₹${refundAmountDecimal.toFixed(2)} issued. Reason: ${reason.trim()}`,
          changedBy: req.user!.id,
        },
      });

      // Restore stock for all order items
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // Restore loyalty points if any were used (only for authenticated users)
      if (order.loyaltyPointsUsed > 0 && order.userId) {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            loyaltyPoints: { increment: order.loyaltyPointsUsed },
          },
        });

        await tx.loyaltyTransaction.create({
          data: {
            userId: order.userId,
            type: "ADJUSTED",
            points: order.loyaltyPointsUsed,
            description: `Points restored from refunded order #${orderNumber}`,
            orderId: order.id,
          },
        });
      }
    });

    res.json({
      success: true,
      data: {
        refundId: refundResult.id,
        orderNumber: order.orderNumber,
        refundAmount: refundAmountDecimal,
        isFullRefund,
        status: "REFUNDED",
      },
    });
  },
};
