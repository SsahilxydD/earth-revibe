import { Router } from "express";
import type { Router as RouterType } from "express";
import crypto from "crypto";
import { prisma } from "@earth-revibe/db";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { webhookLimiter } from "../middleware/rate-limit";
import { asyncHandler } from "../utils/async-handler";

const router: RouterType = Router();

router.post("/razorpay", webhookLimiter, asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn("RAZORPAY_WEBHOOK_SECRET not configured");
    res.status(200).json({ success: true });
    return;
  }

  // Verify signature
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    logger.warn("Invalid Razorpay signature");
    res.status(200).json({ success: false });
    return;
  }

  const event = req.body?.event;
  const payload = req.body?.payload;
  logger.info({ event }, "Razorpay webhook event");

  try {
    switch (event) {
      case "payment.captured": {
        const paymentEntity = payload?.payment?.entity;
        if (!paymentEntity) break;
        const payment = await prisma.payment.findUnique({
          where: { razorpayOrderId: paymentEntity.order_id },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "CAPTURED",
              razorpayPaymentId: paymentEntity.id,
              method: mapPaymentMethod(paymentEntity.method) as any,
              paidAt: new Date(),
            },
          });
          await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: "CONFIRMED" },
          });
        }
        break;
      }

      case "payment.failed": {
        const paymentEntity = payload?.payment?.entity;
        if (!paymentEntity) break;
        const payment = await prisma.payment.findUnique({
          where: { razorpayOrderId: paymentEntity.order_id },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              failureReason: paymentEntity.error_description || "Payment failed",
            },
          });
          await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "refund.processed": {
        const refundEntity = payload?.refund?.entity;
        if (!refundEntity) break;
        const payment = await prisma.payment.findUnique({
          where: { razorpayPaymentId: refundEntity.payment_id },
        });
        if (payment) {
          const refundAmount = refundEntity.amount / 100;
          const isFullRefund = refundAmount >= Number(payment.amount);
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
              refundId: refundEntity.id,
              refundAmount,
            },
          });
          if (isFullRefund) {
            await prisma.order.update({
              where: { id: payment.orderId },
              data: { status: "REFUNDED" },
            });
          }
        }
        break;
      }

      default:
        logger.info({ event }, "Unhandled webhook event");
    }
  } catch (err) {
    logger.error({ err, event }, "Webhook processing error");
  }

  // Always return 200 to prevent Razorpay retries
  res.status(200).json({ success: true });
}));

function mapPaymentMethod(method: string): string | undefined {
  const map: Record<string, string> = {
    upi: "UPI",
    card: "CARD",
    netbanking: "NETBANKING",
    wallet: "WALLET",
    emi: "EMI",
  };
  return map[method];
}

export { router as webhookRouter };
