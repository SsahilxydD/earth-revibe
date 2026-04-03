import { prisma } from '@earth-revibe/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getPostHog } from '../config/posthog';
import { getResend } from '../config/resend';
import { sendWhatsAppAbandonedCart } from '../services/whatsapp.service';

/**
 * Check for abandoned carts and send recovery messages via WhatsApp + email.
 * Runs every 30 minutes via setInterval in index.ts.
 */
export async function runAbandonedCartCheck(): Promise<void> {
  const ph = getPostHog();
  const resend = getResend();

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // ── Logged-in user carts ──────────────────────────────────────────
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
    include: {
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
    },
  });

  let tracked = 0;
  let emailed = 0;
  let whatsapped = 0;
  const frontendUrl = env.FRONTEND_URL;

  for (const cart of abandonedCarts) {
    if (!cart.user?.email && !cart.user?.phone) continue;

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

    // 1. Send WhatsApp recovery message (preferred — higher open rate)
    if (cart.user?.phone) {
      const itemNames = cartItems.map((i) => i.name).join(', ');
      const sent = await sendWhatsAppAbandonedCart(cart.user.phone, firstName, itemNames);
      if (sent) whatsapped++;
    }

    // 2. Send recovery email via Resend (fallback / supplement)
    if (resend && cart.user?.email) {
      try {
        const itemRows = cartItems
          .map(
            (item) =>
              `<tr>
                <td style="padding:12px 8px;border-bottom:1px solid #eee;">
                  <a href="${frontendUrl}/products/${item.slug}" style="color:#121212;text-decoration:none;font-weight:600;">${item.name}</a>
                </td>
                <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
                <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;">\u20B9${item.price.toLocaleString('en-IN')}</td>
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
        emailed++;
        logger.info({ email: cart.user.email }, 'Abandoned cart email sent');
      } catch (emailErr) {
        logger.error({ err: emailErr, email: cart.user.email }, 'Failed to send abandoned cart email');
      }
    }

    // 3. Mark so we don't send again
    await prisma.cart.update({
      where: { id: cart.id },
      data: { abandonedEmailSentAt: new Date() },
    });

    // 4. PostHog analytics
    if (ph) {
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
        },
      });
    }

    tracked++;
  }

  // ── Guest abandoned carts ──────────────────────────────────────────
  const guestCarts = await prisma.guestAbandonedCart.findMany({
    where: {
      emailSent: false,
      updatedAt: { lte: thirtyMinAgo },
    },
  });

  let guestEmailed = 0;

  for (const guest of guestCarts) {
    if (!guest.email) continue;

    const items = guest.items as {
      productName: string;
      slug: string;
      price: number;
      quantity: number;
    }[];
    if (!items || items.length === 0) continue;

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
                <td style="padding:12px 8px;border-bottom:1px solid #eee;text-align:right;">\u20B9${item.price.toLocaleString('en-IN')}</td>
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
        guestEmailed++;
        logger.info({ email: guest.email }, 'Guest abandoned cart email sent');
      } catch (emailErr) {
        logger.error({ err: emailErr, email: guest.email }, 'Failed to send guest abandoned cart email');
      }
    }

    await prisma.guestAbandonedCart.update({
      where: { id: guest.id },
      data: { emailSent: true },
    });

    if (ph) {
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

    tracked++;
  }

  if (ph) await ph.flush();

  if (tracked > 0 || emailed > 0 || whatsapped > 0 || guestEmailed > 0) {
    logger.info({ tracked, emailed, whatsapped, guestEmailed }, 'Abandoned cart check completed');
  }
}
