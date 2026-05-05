import { prisma, Prisma } from '@earth-revibe/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getPostHog } from '../config/posthog';
import { getResend } from '../config/resend';
import { sendWhatsAppAbandonedCart } from '../services/whatsapp.service';

/**
 * Abandoned cart recovery — sends WhatsApp + email recovery messages.
 *
 * Two entry points share the same per-cart logic:
 *   - `runAbandonedCartCheck()` — invoked by node-cron in index.ts and the
 *     admin "Run sweep now" button. Single mutex prevents overlap.
 *   - `processOneAbandonedCart()` / `processOneGuestAbandonedCart()` —
 *     invoked by the admin "Send recovery" per-row button.
 *
 * Retry semantics: a cart is only flagged as "sent" (`abandonedEmailSentAt`
 * stamped) when at least one channel succeeded OR every attempted channel
 * failed permanently (4xx from Meta, no contact info, etc.). Transient
 * failures (network, 5xx) leave the cart unmarked so the next cycle retries.
 */

// Process-local mutex — prevents the cron and a manual "Run sweep now" click
// from running the full sweep concurrently. Best-effort across instances; the
// per-row `abandonedEmailSentAt` filter ensures correctness even if both ran.
let sweepInFlight = false;

const userCartInclude = {
  user: { select: { id: true, email: true, phone: true, firstName: true } },
  items: {
    include: {
      variant: {
        include: {
          product: { select: { id: true, name: true, slug: true, price: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type AbandonedCartCart = Prisma.CartGetPayload<{ include: typeof userCartInclude }>;
export type AbandonedCartGuest = Prisma.GuestAbandonedCartGetPayload<true>;

interface ProcessResult {
  whatsapped: boolean;
  emailed: boolean;
  marked: boolean; // whether abandonedEmailSentAt was stamped
  deferred: boolean; // true when no channel succeeded but at least one is retryable
  rateLimited?: boolean; // true if Meta returned a rate-limit response on this send
}

/**
 * Process one logged-in user's abandoned cart. Returns per-channel outcome.
 * Stamps `abandonedEmailSentAt` only when a channel succeeded OR every
 * attempted channel failed permanently.
 */
export async function processOneAbandonedCart(cart: AbandonedCartCart): Promise<ProcessResult> {
  const ph = getPostHog();
  const resend = getResend();
  const frontendUrl = env.FRONTEND_URL;

  if (!cart.user?.email && !cart.user?.phone) {
    return { whatsapped: false, emailed: false, marked: false, deferred: false };
  }

  const cartItems = cart.items.map((item) => ({
    productId: item.variant.product.id,
    name: item.variant.product.name,
    slug: item.variant.product.slug,
    price: Number(item.variant.product.price),
    quantity: item.quantity,
    variantId: item.variantId,
  }));

  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const firstName = cart.user.firstName || 'there';

  let waAttempted = false;
  let waSucceeded = false;
  let waTransient = false;
  let emailAttempted = false;
  let emailSucceeded = false;
  let emailTransient = false;

  // 1. WhatsApp (preferred — higher open rate)
  let waMessageId: string | undefined;
  let waRateLimited = false;
  if (cart.user?.phone) {
    waAttempted = true;
    const itemNames = cartItems.map((i) => i.name).join(', ');
    const result = await sendWhatsAppAbandonedCart(cart.user.phone, firstName, itemNames);
    waSucceeded = result.ok;
    waTransient = !result.ok && result.retryable;
    waMessageId = result.messageId;
    waRateLimited = !result.ok && (result.status === 429 || result.retryable);
  }

  // 2. Email
  if (resend && cart.user?.email) {
    emailAttempted = true;
    try {
      const itemRows = cartItems
        .map(
          (item) =>
            `<tr>
              <td style="padding:12px 8px;border-bottom:1px solid #eee;">
                <a href="${frontendUrl}/products/${item.slug}" style="color:#121212;text-decoration:none;font-weight:600;">${item.name}</a>
              </td>
              <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
              <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;">₹${item.price.toLocaleString('en-IN')}</td>
            </tr>`
        )
        .join('');

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Earth Revibe <noreply@earthrevibe.com>',
        to: cart.user.email,
        subject: 'You left something behind!',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
            <h1 style="font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px;">Hey ${firstName},</h1>
            <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Looks like you left some items in your cart. They're still waiting for you!
            </p>
            <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
              <thead>
                <tr style="border-bottom:2px solid #121212;">
                  <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Item</th>
                  <th style="padding:8px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Qty</th>
                  <th style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="text-align:center;margin:32px 0;">
              <a href="${frontendUrl}/cart" style="display:inline-block;background:#121212;color:#fff;padding:14px 40px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
                Complete Your Order
              </a>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:24px 0 0;">
              Free shipping on all orders. Questions? Reply to this email.
            </p>
          </div>
        `,
      });
      emailSucceeded = true;
      logger.info({ email: cart.user.email }, 'Abandoned cart email sent');
    } catch (emailErr) {
      emailTransient = true;
      logger.error(
        { err: emailErr, email: cart.user.email },
        'Failed to send abandoned cart email'
      );
    }
  }

  const anySucceeded = waSucceeded || emailSucceeded;
  const anyTransient = waTransient || emailTransient;
  const shouldMark = anySucceeded || (!anyTransient && (waAttempted || emailAttempted));

  if (shouldMark) {
    // Persist the WhatsApp messageId alongside the sent timestamp so the
    // /api/v1/webhooks/whatsapp handler can correlate failure events back
    // to this cart and clear `abandonedEmailSentAt` for retry.
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        abandonedEmailSentAt: new Date(),
        ...(waMessageId ? { lastRecoveryMessageId: waMessageId } : {}),
      },
    });

    if (ph && anySucceeded) {
      ph.capture({
        distinctId: cart.user.id,
        event: 'cart_abandoned',
        properties: {
          email: cart.user.email,
          phone: cart.user.phone,
          first_name: cart.user.firstName,
          item_count: cartItems.length,
          cart_total: cartTotal,
          cart_items: cartItems,
          channel_whatsapp: waSucceeded,
          channel_email: emailSucceeded,
          message_id: waMessageId,
        },
      });
    }
  } else {
    logger.warn(
      {
        cartId: cart.id,
        userId: cart.user.id,
        waAttempted,
        waSucceeded,
        waTransient,
        emailAttempted,
        emailSucceeded,
        emailTransient,
      },
      'Abandoned cart deferred — transient failure on every attempted channel'
    );
  }

  return {
    whatsapped: waSucceeded,
    emailed: emailSucceeded,
    marked: shouldMark,
    deferred: !shouldMark,
    rateLimited: waRateLimited,
  };
}

/**
 * Process one guest abandoned cart (email-only — no phone is captured at the
 * newsletter popup).
 */
export async function processOneGuestAbandonedCart(
  guest: AbandonedCartGuest
): Promise<ProcessResult> {
  const ph = getPostHog();
  const resend = getResend();
  const frontendUrl = env.FRONTEND_URL;

  if (!guest.email) {
    return { whatsapped: false, emailed: false, marked: false, deferred: false };
  }

  const items = guest.items as {
    productName: string;
    slug: string;
    price: number;
    quantity: number;
  }[];
  if (!items || items.length === 0) {
    return { whatsapped: false, emailed: false, marked: false, deferred: false };
  }

  let succeeded = false;
  let transient = false;

  if (resend) {
    try {
      const guestFirstName = guest.firstName || 'there';
      const itemRows = items
        .map(
          (item) =>
            `<tr>
              <td style="padding:12px 8px;border-bottom:1px solid #eee;">
                <a href="${frontendUrl}/products/${item.slug}" style="color:#121212;text-decoration:none;font-weight:600;">${item.productName}</a>
              </td>
              <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
              <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;">₹${item.price.toLocaleString('en-IN')}</td>
            </tr>`
        )
        .join('');

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Earth Revibe <noreply@earthrevibe.com>',
        to: guest.email,
        subject: 'You left something behind!',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;">
            <h1 style="font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px;">Hey ${guestFirstName},</h1>
            <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Looks like you left some items in your cart. They're still waiting for you!
            </p>
            <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
              <thead>
                <tr style="border-bottom:2px solid #121212;">
                  <th style="padding:8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Item</th>
                  <th style="padding:8px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Qty</th>
                  <th style="padding:8px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="text-align:center;margin:32px 0;">
              <a href="${frontendUrl}/cart" style="display:inline-block;background:#121212;color:#fff;padding:14px 40px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">
                Complete Your Order
              </a>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:24px 0 0;">
              Free shipping on all orders. Questions? Reply to this email.
            </p>
          </div>
        `,
      });
      succeeded = true;
      logger.info({ email: guest.email }, 'Guest abandoned cart email sent');
    } catch (emailErr) {
      transient = true;
      logger.error(
        { err: emailErr, email: guest.email },
        'Failed to send guest abandoned cart email'
      );
    }
  }

  // Mark on success or when retry won't help (no resend client / no transient).
  const shouldMark = succeeded || !transient;

  if (shouldMark) {
    await prisma.guestAbandonedCart.update({
      where: { id: guest.id },
      data: { emailSent: true },
    });

    if (ph && succeeded) {
      ph.capture({
        distinctId: guest.email,
        event: 'cart_abandoned',
        properties: {
          email: guest.email,
          first_name: guest.firstName,
          item_count: items.length,
          cart_total: guest.cartTotal,
          is_guest: true,
        },
      });
    }
  }

  return {
    whatsapped: false,
    emailed: succeeded,
    marked: shouldMark,
    deferred: !shouldMark,
  };
}

/**
 * Sweep all eligible abandoned carts in one pass. Mutex-protected so concurrent
 * triggers (cron + admin "Run sweep now") collapse into a single execution.
 */
export async function runAbandonedCartCheck(): Promise<{
  ran: boolean;
  tracked: number;
  emailed: number;
  whatsapped: number;
  guestEmailed: number;
  deferred: number;
  capped: boolean;
  rateLimited: boolean;
}> {
  if (sweepInFlight) {
    logger.info('Abandoned cart sweep already in flight — skipping');
    return {
      ran: false,
      tracked: 0,
      emailed: 0,
      whatsapped: 0,
      guestEmailed: 0,
      deferred: 0,
      capped: false,
      rateLimited: false,
    };
  }
  sweepInFlight = true;
  try {
    const ph = getPostHog();
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Per-cycle cap protects the shared 2000/24h Meta budget. Anything beyond
    // the cap is left for the next 15-min cycle.
    const cap = env.WHATSAPP_ABANDONED_CART_SWEEP_CAP;

    // ── Logged-in carts ──────────────────────────────────────────
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lte: thirtyMinAgo },
        abandonedEmailSentAt: null,
        items: { some: {} },
        user: {
          orders: {
            none: { createdAt: { gte: twentyFourHoursAgo } },
          },
        },
      },
      include: userCartInclude,
      take: cap,
      orderBy: { updatedAt: 'asc' }, // oldest-pending-first so nothing starves
    });

    const capped = abandonedCarts.length === cap;

    let tracked = 0;
    let emailed = 0;
    let whatsapped = 0;
    let deferred = 0;
    let rateLimited = false;

    for (const cart of abandonedCarts) {
      const r = await processOneAbandonedCart(cart);
      if (r.emailed) emailed++;
      if (r.whatsapped) whatsapped++;
      if (r.marked) tracked++;
      if (r.deferred) deferred++;
      // First rate-limit hit = no point burning the rest of the cycle on
      // requests that are guaranteed to fail. Bail out and let the next 15-min
      // tick try again. Email-only carts still process below.
      if (r.rateLimited) {
        rateLimited = true;
        logger.warn(
          'Meta rate-limit detected — stopping WhatsApp sends this cycle to preserve daily budget'
        );
        break;
      }
    }

    // ── Guest carts (email-only, not affected by Meta rate limits) ──
    const guestCarts = await prisma.guestAbandonedCart.findMany({
      where: {
        emailSent: false,
        updatedAt: { lte: thirtyMinAgo },
      },
      take: cap,
      orderBy: { updatedAt: 'asc' },
    });

    let guestEmailed = 0;
    let guestDeferred = 0;

    for (const guest of guestCarts) {
      const r = await processOneGuestAbandonedCart(guest);
      if (r.emailed) guestEmailed++;
      if (r.marked) tracked++;
      if (r.deferred) guestDeferred++;
    }

    if (ph) await ph.flush();

    if (
      tracked > 0 ||
      emailed > 0 ||
      whatsapped > 0 ||
      guestEmailed > 0 ||
      deferred > 0 ||
      guestDeferred > 0 ||
      capped ||
      rateLimited
    ) {
      logger.info(
        {
          tracked,
          emailed,
          whatsapped,
          guestEmailed,
          deferred,
          guestDeferred,
          capped,
          rateLimited,
          cap,
        },
        'Abandoned cart sweep completed'
      );
    }

    return {
      ran: true,
      tracked,
      emailed,
      whatsapped,
      guestEmailed,
      deferred: deferred + guestDeferred,
      capped,
      rateLimited,
    };
  } finally {
    sweepInFlight = false;
  }
}
