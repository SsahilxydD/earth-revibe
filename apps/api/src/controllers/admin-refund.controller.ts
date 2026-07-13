import type { Request, Response } from 'express';
import { prisma, Prisma } from '@earth-revibe/db';
import { getRazorpay } from '../config/razorpay';
import { ApiError } from '../utils/api-error';
import { returnService } from '../services/return.service';
import { reverseOrderPoints } from '../services/loyalty-award.service';

export const adminRefundController = {
  async initiateRefund(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const { amount, reason } = req.body as { amount?: number; reason: string };

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw ApiError.badRequest('Refund reason is required');
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        throw ApiError.badRequest('Refund amount must be a positive number');
      }
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
      throw ApiError.notFound('Order not found');
    }

    if (!order.payment) {
      throw ApiError.badRequest('No payment found for this order');
    }

    if (order.payment.status !== 'CAPTURED') {
      throw ApiError.badRequest(
        `Cannot refund a payment with status "${order.payment.status}". Only captured payments can be refunded.`
      );
    }

    // payment.status REFUNDED / PARTIALLY_REFUNDED are already excluded by the
    // CAPTURED check above; only block the order-side cancellation case.
    if (order.status === 'CANCELLED') {
      throw ApiError.badRequest('Cannot refund a cancelled order');
    }

    if (!order.payment.razorpayPaymentId) {
      throw ApiError.badRequest('No Razorpay payment ID found. Cannot process refund.');
    }

    // Calculate refund amount (in paise for Razorpay)
    const paymentAmountInPaise = Math.round(Number(order.payment.amount) * 100);
    const refundAmountInPaise = amount ? Math.round(amount * 100) : paymentAmountInPaise;

    if (refundAmountInPaise <= 0) {
      throw ApiError.badRequest('Refund amount must be greater than zero');
    }

    if (refundAmountInPaise > paymentAmountInPaise) {
      throw ApiError.badRequest('Refund amount cannot exceed the payment amount');
    }

    // Issue refund via Razorpay
    const refundResult = await getRazorpay().payments.refund(order.payment.razorpayPaymentId, {
      amount: refundAmountInPaise,
      notes: { reason: reason.trim(), orderNumber },
    });

    const refundAmountDecimal = refundAmountInPaise / 100;
    const isFullRefund = refundAmountInPaise === paymentAmountInPaise;

    // Wrap all DB writes in a transaction for data integrity
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update payment record
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundId: refundResult.id,
          refundAmount: refundAmountDecimal,
          refundedAt: new Date(),
        },
      });

      // If this refund settles a customer return request, advance its lifecycle.
      await returnService.linkRefund(tx, order.id, refundAmountDecimal, isFullRefund, req.user!.id);

      // Refund is a Payment-level event in the six-status model — order.status
      // stays where it was (DELIVERED / RETURNED / CANCELLED). Payment.status
      // carries the REFUNDED / PARTIALLY_REFUNDED truth (set above). The
      // status-history row uses the unchanged order.status but records the
      // refund as a note so the admin order detail still shows it in the
      // timeline.
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: isFullRefund
            ? `Full refund of ₹${refundAmountDecimal.toFixed(2)} issued. Reason: ${reason.trim()}`
            : `Partial refund of ₹${refundAmountDecimal.toFixed(2)} issued. Reason: ${reason.trim()}`,
          changedBy: req.user!.id,
        },
      });

      // Only restore stock on full refund
      if (isFullRefund) {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Only reverse loyalty points on a full refund. The clawback is clamped to
      // the current balance so refunding an order whose cashback was already
      // redeemed can never drive the balance negative.
      if (isFullRefund) {
        await reverseOrderPoints(tx, order, 'refunded');
      }
    });

    res.json({
      success: true,
      data: {
        refundId: refundResult.id,
        orderNumber: order.orderNumber,
        refundAmount: refundAmountDecimal,
        isFullRefund,
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });
  },
};
