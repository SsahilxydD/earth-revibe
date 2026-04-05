import { Router } from 'express';
import type { Router as RouterType } from 'express';
import crypto from 'crypto';
import { prisma } from '@earth-revibe/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getPostHog } from '../config/posthog';
import { sendMetaEvent } from '../utils/meta-conversions';
import { webhookLimiter } from '../middleware/rate-limit';
import { asyncHandler } from '../utils/async-handler';
import { finalizeOrderFromPending } from '../services/checkout.service';

const router: RouterType = Router();

router.post(
  '/razorpay',
  webhookLimiter,
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn('RAZORPAY_WEBHOOK_SECRET not configured');
      res.status(200).json({ success: true });
      return;
    }

    // Verify signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      logger.warn('Invalid Razorpay signature');
      res.status(200).json({ success: false });
      return;
    }

    const event = req.body?.event;
    const payload = req.body?.payload;
    logger.info({ event }, 'Razorpay webhook event');

    try {
      switch (event) {
        case 'payment.captured': {
          const paymentEntity = payload?.payment?.entity;
          if (!paymentEntity) break;
          const payment = await prisma.payment.findUnique({
            where: { razorpayOrderId: paymentEntity.order_id },
          });
          if (payment) {
            // Happy path: order already created by verifyMagicPayment — just update status
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'CAPTURED',
                razorpayPaymentId: paymentEntity.id,
                method: mapPaymentMethod(paymentEntity.method) as any,
                paidAt: new Date(),
              },
            });
            await prisma.order.update({
              where: { id: payment.orderId },
              data: { status: 'CONFIRMED' },
            });

            // Server-side tracking — guaranteed even if client JS didn't fire
            const ph = getPostHog();
            if (ph) {
              const order = await prisma.order.findUnique({
                where: { id: payment.orderId },
                select: { orderNumber: true, userId: true, guestEmail: true, totalAmount: true },
              });
              if (order) {
                ph.capture({
                  distinctId: order.userId || order.guestEmail || 'anonymous',
                  event: 'payment_captured_webhook',
                  properties: {
                    order_id: order.orderNumber,
                    total: Number(order.totalAmount),
                    payment_method: mapPaymentMethod(paymentEntity.method),
                    razorpay_payment_id: paymentEntity.id,
                  },
                });

                // Meta Conversions API — redundant Purchase for reliability
                sendMetaEvent({
                  eventName: 'Purchase',
                  email: order.guestEmail || undefined,
                  userId: order.userId || undefined,
                  value: Number(order.totalAmount),
                  currency: 'INR',
                  orderId: order.orderNumber,
                  contentType: 'product',
                }).catch(() => {});
              }
            }
          } else {
            // Fallback: client-side verifyMagicPayment failed or timed out.
            // Finalize the order from PendingCheckout so no paid order is lost.
            const pending = await prisma.pendingCheckout.findUnique({
              where: { razorpayOrderId: paymentEntity.order_id },
            });
            if (pending) {
              logger.warn(
                { razorpayOrderId: paymentEntity.order_id, orderNumber: pending.orderNumber },
                'Webhook fallback: finalizing order from PendingCheckout (client verification likely failed)'
              );
              try {
                const result = await finalizeOrderFromPending(pending, {
                  razorpayOrderId: paymentEntity.order_id,
                  razorpayPaymentId: paymentEntity.id,
                  razorpaySignature: '',
                  method: mapPaymentMethod(paymentEntity.method),
                });

                if (result) {
                  logger.info(
                    { orderNumber: pending.orderNumber },
                    'Webhook fallback: order finalized successfully'
                  );
                } else {
                  // Client won the race — update payment method + run analytics
                  // since verifyMagicPayment doesn't have the payment method.
                  const racedPayment = await prisma.payment.findUnique({
                    where: { razorpayOrderId: paymentEntity.order_id },
                    include: {
                      order: {
                        select: {
                          id: true,
                          orderNumber: true,
                          userId: true,
                          guestEmail: true,
                          totalAmount: true,
                        },
                      },
                    },
                  });
                  if (racedPayment) {
                    await prisma.payment.update({
                      where: { id: racedPayment.id },
                      data: {
                        method: mapPaymentMethod(paymentEntity.method) as any,
                        status: 'CAPTURED',
                        paidAt: racedPayment.paidAt || new Date(),
                      },
                    });

                    const ph = getPostHog();
                    if (ph && racedPayment.order) {
                      ph.capture({
                        distinctId:
                          racedPayment.order.userId || racedPayment.order.guestEmail || 'anonymous',
                        event: 'payment_captured_webhook',
                        properties: {
                          order_id: racedPayment.order.orderNumber,
                          total: Number(racedPayment.order.totalAmount),
                          payment_method: mapPaymentMethod(paymentEntity.method),
                          razorpay_payment_id: paymentEntity.id,
                        },
                      });
                    }
                  }
                  logger.info(
                    { orderNumber: pending.orderNumber },
                    'Webhook fallback: client won race, updated payment method'
                  );
                }
              } catch (finalizeErr) {
                logger.error(
                  { err: finalizeErr, orderNumber: pending.orderNumber },
                  'Webhook fallback: failed to finalize order from PendingCheckout'
                );
                // Return 500 so Razorpay retries this webhook instead of silently dropping the order
                res.status(500).json({ success: false });
                return;
              }
            } else {
              logger.warn(
                { razorpayOrderId: paymentEntity.order_id },
                'Webhook: no payment or pending checkout found for captured payment'
              );
            }
          }
          break;
        }

        case 'payment.failed': {
          const paymentEntity = payload?.payment?.entity;
          if (!paymentEntity) break;
          const payment = await prisma.payment.findUnique({
            where: { razorpayOrderId: paymentEntity.order_id },
          });
          if (payment) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'FAILED',
                failureReason: paymentEntity.error_description || 'Payment failed',
              },
            });
            await prisma.order.update({
              where: { id: payment.orderId },
              data: { status: 'CANCELLED' },
            });

            const phFailed = getPostHog();
            if (phFailed) {
              const failedOrder = await prisma.order.findUnique({
                where: { id: payment.orderId },
                select: { orderNumber: true, userId: true, guestEmail: true },
              });
              if (failedOrder) {
                phFailed.capture({
                  distinctId: failedOrder.userId || failedOrder.guestEmail || 'anonymous',
                  event: 'payment_failed',
                  properties: {
                    order_id: failedOrder.orderNumber,
                    error: paymentEntity.error_description,
                  },
                });
              }
            }
          }
          break;
        }

        case 'refund.processed': {
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
                status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                refundId: refundEntity.id,
                refundAmount,
              },
            });
            if (isFullRefund) {
              await prisma.order.update({
                where: { id: payment.orderId },
                data: { status: 'REFUNDED' },
              });
            }
          }
          break;
        }

        default:
          logger.info({ event }, 'Unhandled webhook event');
      }
    } catch (err) {
      logger.error({ err, event }, 'Webhook processing error');
    }

    // Always return 200 to prevent Razorpay retries
    res.status(200).json({ success: true });
  })
);

function mapPaymentMethod(method: string): string | undefined {
  const map: Record<string, string> = {
    upi: 'UPI',
    card: 'CARD',
    netbanking: 'NETBANKING',
    wallet: 'WALLET',
    emi: 'EMI',
  };
  return map[method];
}

export { router as webhookRouter };
