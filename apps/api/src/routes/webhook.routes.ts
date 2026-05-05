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

    // Verify signature using the raw request body — Razorpay signs the exact
    // bytes it sends, and JSON.stringify(req.body) may reorder keys or change
    // whitespace, causing a mismatch.
    const rawBody = (req as any).rawBody;
    const body = rawBody || JSON.stringify(req.body);

    if (!rawBody) {
      logger.warn('Webhook rawBody missing — falling back to JSON.stringify (signature may fail)');
    }

    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

    const sigBuffer = Buffer.from(signature || '', 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (
      !signature ||
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      logger.warn(
        { hasSignature: !!signature, hasRawBody: !!rawBody },
        'Invalid Razorpay webhook signature'
      );
      res.status(400).json({ success: false });
      return;
    }

    const event = req.body?.event;
    const payload = req.body?.payload;
    const webhookId = req.headers['x-razorpay-event-id'] as string | undefined;

    // Structured webhook log — searchable in Railway/log aggregator
    logger.info(
      {
        webhookId,
        event,
        razorpayOrderId: payload?.payment?.entity?.order_id || payload?.refund?.entity?.payment_id,
        razorpayPaymentId: payload?.payment?.entity?.id,
        amount: payload?.payment?.entity?.amount,
        method: payload?.payment?.entity?.method,
      },
      'Razorpay webhook received'
    );

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
      logger.error({ err, event, webhookId }, 'Webhook processing error');
      // Return 500 for unexpected errors so Razorpay retries.
      // The reconciliation cron is the ultimate safety net if retries also fail.
      res.status(500).json({ success: false });
      return;
    }

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
    cod: 'COD',
  };
  return map[method];
}

// ====================================================================
// WhatsApp Cloud API webhook
// ====================================================================
// Meta sends:
//   - GET handshake when you save the webhook URL in Business Manager
//     (echo back hub.challenge if hub.verify_token matches our secret)
//   - POST events for every status transition on every outbound template
//     (sent → delivered → read; or → failed). HMAC-SHA256 over the raw body
//     using the App Secret, header X-Hub-Signature-256.
//
// We persist every event to whatsapp_message_events for audit/queryability,
// and close the loop on abandoned-cart deliverability: if a message we sent
// for cart recovery comes back as "failed", we clear `abandonedEmailSentAt`
// (or `emailSent` for a guest) so the next 15-min sweep retries that user.

router.get('/whatsapp', (req, res) => {
  const verifyToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    logger.warn('WHATSAPP_WEBHOOK_VERIFY_TOKEN not configured — rejecting handshake');
    res.status(503).send('webhook not configured');
    return;
  }
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken && typeof challenge === 'string') {
    logger.info('WhatsApp webhook verified by Meta');
    res.status(200).send(challenge);
    return;
  }
  logger.warn(
    { mode, hasToken: !!token, tokenMatch: token === verifyToken },
    'WhatsApp webhook handshake rejected'
  );
  res.status(403).send('Forbidden');
});

router.post(
  '/whatsapp',
  webhookLimiter,
  asyncHandler(async (req, res) => {
    const appSecret = env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      logger.warn('WHATSAPP_APP_SECRET not configured — accepting webhook unsigned (DEV ONLY)');
      // In production we want a hard fail rather than silently process
      // unverified payloads.
      if (env.NODE_ENV === 'production') {
        res.status(503).json({ success: false });
        return;
      }
    } else {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const rawBody: string | undefined = (req as any).rawBody;
      if (!rawBody) {
        logger.warn('WhatsApp webhook missing rawBody — cannot verify signature');
        res.status(400).json({ success: false });
        return;
      }
      const expected =
        'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(signature || '', 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (
        !signature ||
        sigBuf.length !== expBuf.length ||
        !crypto.timingSafeEqual(sigBuf, expBuf)
      ) {
        logger.warn(
          { hasSignature: !!signature, sigLen: sigBuf.length, expLen: expBuf.length },
          'WhatsApp webhook signature mismatch'
        );
        res.status(401).json({ success: false });
        return;
      }
    }

    // Acknowledge fast — Meta retries aggressively if we don't 200 quickly,
    // and the per-event work is best-effort. Process inline anyway since the
    // payloads are tiny; if Meta starts seeing 5xx we can move to a queue.
    const body = req.body as {
      object?: string;
      entry?: {
        id?: string;
        changes?: {
          field?: string;
          value?: {
            messaging_product?: string;
            metadata?: { display_phone_number?: string; phone_number_id?: string };
            statuses?: Array<{
              id: string; // message id
              recipient_id?: string; // wa_id
              status: 'sent' | 'delivered' | 'read' | 'failed';
              timestamp?: string; // unix seconds, string
              conversation?: { id?: string; origin?: { type?: string } };
              pricing?: { pricing_model?: string; category?: string };
              errors?: Array<{ code?: number; title?: string; message?: string }>;
            }>;
            messages?: Array<{
              id: string; // Meta's message id
              from?: string; // sender's wa_id (digits-only)
              timestamp?: string; // unix seconds, string
              type?:
                | 'text'
                | 'image'
                | 'audio'
                | 'video'
                | 'document'
                | 'sticker'
                | 'location'
                | 'contacts'
                | 'interactive'
                | 'reaction'
                | 'unknown';
              text?: { body?: string };
              image?: { id?: string; mime_type?: string; sha256?: string; caption?: string };
              audio?: { id?: string; mime_type?: string };
              video?: { id?: string; mime_type?: string; caption?: string };
              document?: { id?: string; mime_type?: string; filename?: string };
              interactive?: {
                type?: string;
                button_reply?: { id?: string; title?: string };
                list_reply?: { id?: string; title?: string; description?: string };
              };
              context?: { id?: string; from?: string }; // present when this message is a reply
            }>;
          };
        }[];
      }[];
    };

    if (body.object !== 'whatsapp_business_account') {
      // Not a WhatsApp event — silently ack so Meta doesn't keep retrying.
      res.status(200).json({ success: true });
      return;
    }

    const allStatuses = (body.entry ?? []).flatMap(
      (e) => e.changes?.flatMap((c) => c.value?.statuses ?? []) ?? []
    );

    const allMessages = (body.entry ?? []).flatMap(
      (e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []
    );

    if (allStatuses.length === 0 && allMessages.length === 0) {
      // Empty payload (e.g. a reactions-only delivery we don't store). Ack.
      res.status(200).json({ success: true });
      return;
    }

    for (const s of allStatuses) {
      const eventAt = s.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date();
      const error = s.errors?.[0];

      try {
        await prisma.whatsAppMessageEvent.create({
          data: {
            messageId: s.id,
            waId: s.recipient_id,
            status: s.status,
            errorCode: error?.code,
            errorTitle: error?.title?.slice(0, 255),
            errorMessage: error?.message,
            conversationId: s.conversation?.id,
            conversationCategory: s.conversation?.origin?.type,
            pricingModel: s.pricing?.pricing_model,
            pricingCategory: s.pricing?.category,
            rawPayload: s as unknown as object,
            eventAt,
          },
        });
      } catch (err) {
        // Don't let a DB write hiccup turn into a 5xx — Meta retries are
        // expensive (and out of order). Log and move on.
        logger.error({ err, messageId: s.id }, 'Failed to persist WhatsApp message event');
      }

      logger.info(
        {
          messageId: s.id,
          waId: s.recipient_id,
          status: s.status,
          errorCode: error?.code,
          errorTitle: error?.title,
          errorMessage: error?.message,
          conversationCategory: s.conversation?.origin?.type,
        },
        'WhatsApp delivery status'
      );

      // ── Close the loop on abandoned-cart recovery ────────────────
      // If Meta accepted our message but later reports it failed (template
      // paused mid-cycle, recipient blocked, undeliverable number, etc.),
      // un-mark the cart so the next sweep retries via email.
      if (s.status === 'failed') {
        try {
          const [cartHit, guestHit] = await Promise.all([
            prisma.cart.updateMany({
              where: { lastRecoveryMessageId: s.id },
              data: { abandonedEmailSentAt: null },
            }),
            prisma.guestAbandonedCart.updateMany({
              where: { lastRecoveryMessageId: s.id },
              data: { emailSent: false },
            }),
          ]);
          if (cartHit.count + guestHit.count > 0) {
            logger.warn(
              {
                messageId: s.id,
                userCartsReopened: cartHit.count,
                guestCartsReopened: guestHit.count,
                errorCode: error?.code,
              },
              'Abandoned-cart recovery message failed at Meta — cart reopened for retry'
            );
          }
        } catch (err) {
          logger.error(
            { err, messageId: s.id },
            'Failed to reopen abandoned cart on Meta failure event'
          );
        }
      }
    }

    // ── Inbound messages (customer replies, support questions) ───────────
    // Persist for the CRM /inbox view. Soft-link to a User by phone-digit
    // match against the sender's wa_id; nullable userId is fine — most
    // first-touch inbound messages are from prospects who aren't users yet.
    for (const m of allMessages) {
      if (!m.from || !m.id) continue;

      const matchedUser = await prisma.user
        .findFirst({ where: { phone: { endsWith: m.from.slice(-10) } }, select: { id: true } })
        .catch(() => null);

      const text =
        m.text?.body ??
        m.interactive?.button_reply?.title ??
        m.interactive?.list_reply?.title ??
        m.image?.caption ??
        m.video?.caption ??
        null;

      const mediaId = m.image?.id ?? m.audio?.id ?? m.video?.id ?? m.document?.id ?? null;
      // Meta returns media as IDs; fetching the actual URL is a separate API
      // call that returns a short-lived URL. Defer that to v2 — store the id
      // as a stub for now; the inbox UI can render "media attached" without
      // the actual file.
      const mediaUrl = mediaId ? `meta-media://${mediaId}` : null;

      try {
        await prisma.whatsAppInboundMessage.upsert({
          where: { messageId: m.id },
          create: {
            messageId: m.id,
            fromWaId: m.from,
            userId: matchedUser?.id,
            messageType: m.type ?? 'unknown',
            text,
            mediaUrl,
            repliedTo: m.context?.id,
            rawPayload: m as unknown as object,
          },
          update: {}, // duplicate webhook delivery: keep first-write wins
        });
      } catch (err) {
        logger.error(
          { err, messageId: m.id, fromWaId: m.from },
          'Failed to persist inbound WhatsApp message'
        );
      }

      logger.info(
        {
          messageId: m.id,
          fromWaId: m.from,
          messageType: m.type,
          matchedUserId: matchedUser?.id,
          isReply: Boolean(m.context?.id),
        },
        'WhatsApp inbound message received'
      );
    }

    res.status(200).json({ success: true });
  })
);

export { router as webhookRouter };
