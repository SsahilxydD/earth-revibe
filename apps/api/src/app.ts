import * as Sentry from '@sentry/node';
import express, { type Express } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { APP_CONSTANTS } from './config/constants';
import { errorHandler } from './middleware/error-handler';
import { auditLog } from './middleware/audit-log';
import { authRouter } from './routes/auth.routes';
import { productRouter } from './routes/product.routes';
import { categoryRouter } from './routes/category.routes';
import { searchRouter } from './routes/search.routes';
import { cartRouter } from './routes/cart.routes';
import { addressRouter } from './routes/address.routes';
import { orderRouter } from './routes/order.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { shippingRouter } from './routes/shipping.routes';
import { discountRouter } from './routes/discount.routes';
import { adminOrderRouter } from './routes/admin-order.routes';
import { adminCustomerRouter } from './routes/admin-customer.routes';
import { wishlistRouter } from './routes/wishlist.routes';
import { loyaltyRouter } from './routes/loyalty.routes';
import { referralRouter } from './routes/referral.routes';
import { blogRouter } from './routes/blog.routes';
import { adminBlogRouter } from './routes/admin-blog.routes';
import { supportRouter } from './routes/support.routes';
import { adminSupportRouter } from './routes/admin-support.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { adminDiscountRouter } from './routes/admin-discount.routes';
import { adminInventoryRouter } from './routes/admin-inventory.routes';
import { adminProductRouter } from './routes/admin-product.routes';
import { adminNotificationRouter } from './routes/admin-notification.routes';
import { adminSettingsRouter } from './routes/admin-settings.routes';
import { adminHomepageRouter } from './routes/admin-homepage.routes';
import { homepageRouter } from './routes/homepage.routes';
import { uploadRouter } from './routes/upload.routes';
import { webhookRouter } from './routes/webhook.routes';
import { travelApplicationRouter } from './routes/travel-application.routes';
import { adminTravelApplicationRouter } from './routes/admin-travel-application.routes';
import { sanitize } from './middleware/sanitize';

const app: Express = express();

// Trust proxy (Railway sits behind a reverse proxy)
app.set('trust proxy', 1);

// Structured request logging
app.use(pinoHttp({ logger }));

// Audit logging for mutating requests (POST, PUT, PATCH, DELETE)
app.use(auditLog);

// Compression
app.use(compression());

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const allowed = [
        env.FRONTEND_URL,
        env.ADMIN_URL,
        env.TRIP_FORM_URL,
        // Production custom domains (both www and non-www)
        'https://earthrevibe.com',
        'https://www.earthrevibe.com',
      ].filter(Boolean);

      // Exact match or Vercel preview URLs for our apps
      if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      // In development, allow localhost on any port
      if (env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['X-Export-Truncated', 'X-Export-Total', 'X-Export-Count'],
  })
);

// Cookie parsing
app.use(cookieParser());

// Body parsing
// Preserve raw body for webhook signature verification — Razorpay signs
// the exact bytes it sends, so we need the untouched body to compare.
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      if ((req as any).originalUrl?.startsWith('/api/v1/webhooks')) {
        (req as any).rawBody = buf.toString('utf8');
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Input sanitization
app.use(sanitize);

// Rate limiting — per IP.
// Public GET endpoints (products, categories, homepage, blog, search) are exempt
// because Indian mobile carriers use CGNAT — thousands of subscribers share one
// public IP, so they collectively exhaust a per-IP bucket almost immediately.
// Mutations (POST/PUT/DELETE) and sensitive flows (auth, checkout) remain limited.
const PUBLIC_GET_PATHS = /^\/api\/v1\/(products|categories|homepage|blog|search)(\/|$|\?)/;

app.use(
  rateLimit({
    windowMs: APP_CONSTANTS.RATE_LIMIT_WINDOW_MS,
    limit: APP_CONSTANTS.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.method === 'GET' && PUBLIC_GET_PATHS.test(req.path),
  })
);

// Health check — verify DB connectivity
app.get('/api/v1/health', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    const { prisma } = await import('@earth-revibe/db');
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'unavailable';
  }

  const healthy = checks.database === 'ok';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'Earth Revibe API is running' : 'Service degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Cleanup stale pending checkouts, restore reserved stock, and purge expired idempotency keys.
// Also reconciles paid orders where the webhook failed — checks Razorpay API before releasing stock.
app.post('/api/v1/internal/cleanup', async (req, res) => {
  // Protect with CRON_SECRET if configured
  if (env.CRON_SECRET && req.headers['x-cron-secret'] !== env.CRON_SECRET) {
    res
      .status(401)
      .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } });
    return;
  }

  try {
    const { prisma } = await import('@earth-revibe/db');
    const { reconcileStaleCheckouts } = await import('./services/checkout.service.js');

    // 1. Reconcile stale checkouts — finalize paid ones, release unpaid ones
    const reconciled = await reconcileStaleCheckouts();

    // 2. Clean expired idempotency keys
    const idempotencyResult = await prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    logger.info(
      {
        reconciled,
        idempotencyKeysDeleted: idempotencyResult.count,
      },
      'Cleanup completed'
    );

    res.json({
      success: true,
      data: {
        reconciled,
        idempotencyKeysDeleted: idempotencyResult.count,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Cleanup failed');
    res
      .status(500)
      .json({ success: false, error: { code: 'CLEANUP_FAILED', message: 'Cleanup failed' } });
  }
});

// Abandoned cart detection — called by cron-job.org every hour.
// Sends recovery emails via Resend, fires cart_abandoned to PostHog.
// Fixed: old query only caught carts updated 1-2h ago (narrow window).
// Now catches ALL carts idle for 1h+ that haven't already received an email.
app.post('/api/v1/internal/abandoned-carts', async (_req, res) => {
  try {
    const { prisma } = await import('@earth-revibe/db');
    const { getPostHog } = await import('./config/posthog.js');
    const { getResend } = await import('./config/resend.js');
    const { sendWhatsAppAbandonedCart } = await import('./services/whatsapp.service.js');

    const ph = getPostHog();
    const resend = getResend();

    // Find carts that:
    // 1. Have items in them
    // 2. Were last updated at least 30 minutes ago (user isn't actively shopping)
    // 3. Haven't already received an abandoned cart email
    // 4. Belong to users who haven't placed an order in the last 24 hours
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

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

      // 1. Send recovery email via Resend
      if (resend) {
        try {
          const firstName = cart.user.firstName || 'there';
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
          logger.error(
            { err: emailErr, email: cart.user.email },
            'Failed to send abandoned cart email'
          );
        }
      }

      // 2. Send WhatsApp recovery message (if user has phone)
      if (cart.user?.phone) {
        const firstName = cart.user.firstName || 'there';
        const itemNames = cartItems.map((i) => i.name).join(', ');
        const sent = await sendWhatsAppAbandonedCart(cart.user.phone, firstName, itemNames);
        if (sent) whatsapped++;
      }

      // 3. Mark the cart so we don't send duplicate messages
      await prisma.cart.update({
        where: { id: cart.id },
        data: { abandonedEmailSentAt: new Date() },
      });

      // 4. Fire event to PostHog for analytics dashboards
      if (ph) {
        ph.capture({
          distinctId: cart.user.id,
          event: 'cart_abandoned',
          properties: {
            email: cart.user.email,
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
    // Process guest carts captured via newsletter popup email
    const guestThirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const guestCarts = await prisma.guestAbandonedCart.findMany({
      where: {
        emailSent: false,
        updatedAt: { lte: guestThirtyMinAgo },
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
          const firstName = guest.firstName || 'there';
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
          guestEmailed++;
          logger.info({ email: guest.email }, 'Guest abandoned cart email sent');
        } catch (emailErr) {
          logger.error(
            { err: emailErr, email: guest.email },
            'Failed to send guest abandoned cart email'
          );
        }
      }

      // Mark as sent
      await prisma.guestAbandonedCart.update({
        where: { id: guest.id },
        data: { emailSent: true },
      });

      // Track in PostHog
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

    logger.info(
      { tracked, emailed, whatsapped, guestEmailed },
      'Abandoned cart detection completed'
    );
    res.json({ success: true, data: { tracked, emailed, whatsapped, guestEmailed } });
  } catch (err) {
    logger.error({ err }, 'Abandoned cart detection failed');
    res.status(500).json({
      success: false,
      error: { code: 'ABANDONED_CART_FAILED', message: 'Abandoned cart detection failed' },
    });
  }
});

// Guest cart snapshot — called when newsletter popup captures an email
// Stores the guest's email + cart items so abandoned cart emails work for non-logged-in visitors
app.post('/api/v1/cart/guest-snapshot', async (req, res) => {
  try {
    const { prisma } = await import('@earth-revibe/db');
    const { email, firstName, items } = req.body as {
      email?: string;
      firstName?: string;
      items?: {
        variantId: string;
        productName: string;
        slug: string;
        price: number;
        quantity: number;
      }[];
    };

    if (!email || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email and items required' },
      });
    }

    const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Upsert — update if this email already has a snapshot
    await prisma.guestAbandonedCart.upsert({
      where: { email },
      create: { email, firstName, items, cartTotal },
      update: { items, cartTotal, firstName, emailSent: false, updatedAt: new Date() },
    });

    logger.info({ email, itemCount: items.length }, 'Guest cart snapshot saved');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Guest cart snapshot failed');
    res.status(500).json({
      success: false,
      error: { code: 'SNAPSHOT_FAILED', message: 'Failed to save cart snapshot' },
    });
  }
});

// Newsletter subscribe — instantly sends EARTH15OFF discount code via email
app.post('/api/v1/newsletter/subscribe', async (req, res) => {
  try {
    const { getResend } = await import('./config/resend.js');
    const resend = getResend();
    const { email } = req.body as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Valid email required' } });
    }

    // Send discount code email instantly
    const logoUrl = `${env.FRONTEND_URL}/Earth%20Revibe%20Logo%20Black.png`;
    const frontendUrl = env.FRONTEND_URL;

    if (resend) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Earth Revibe <noreply@earthrevibe.com>',
        to: email,
        subject: "You're in. Here's 15% off your first order.",
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px">
<tr><td align="center">

<!-- Main card -->
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:0;max-width:560px;width:100%">

  <!-- Black header with logo -->
  <tr>
    <td style="background:#121212;padding:40px 40px 32px;text-align:center">
      <img src="${logoUrl}" alt="Earth Revibe" width="48" height="48" style="display:block;margin:0 auto 16px;filter:invert(1)">
      <p style="margin:0;font-size:11px;letter-spacing:4px;color:rgba(255,255,255,0.5);text-transform:uppercase">Vacation-Ready Minimal Fits</p>
    </td>
  </tr>

  <!-- Welcome message -->
  <tr>
    <td style="padding:40px 40px 0;text-align:center">
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:300;color:#121212;letter-spacing:-0.5px">You're in.</h1>
      <p style="margin:0;font-size:15px;color:#888;line-height:1.6">
        Welcome to the Earth Revibe community.<br>
        Here's something to get you started.
      </p>
    </td>
  </tr>

  <!-- Discount code block -->
  <tr>
    <td style="padding:32px 40px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#121212;border-radius:12px">
        <tr>
          <td style="padding:32px 24px;text-align:center">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.4);text-transform:uppercase">Your Exclusive Code</p>
            <p style="margin:0 0 8px;font-size:36px;font-weight:700;color:#ffffff;letter-spacing:6px;font-family:'Courier New',monospace">EARTH15OFF</p>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.6)">15% off your first order</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Perks row -->
  <tr>
    <td style="padding:0 40px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="text-align:center;padding:16px 8px;border:1px solid #f0f0f0;border-right:none">
            <p style="margin:0;font-size:16px">&#x2728;</p>
            <p style="margin:4px 0 0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase">No Minimum</p>
          </td>
          <td width="34%" style="text-align:center;padding:16px 8px;border:1px solid #f0f0f0">
            <p style="margin:0;font-size:16px">&#x1F69A;</p>
            <p style="margin:4px 0 0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase">Free Shipping</p>
          </td>
          <td width="33%" style="text-align:center;padding:16px 8px;border:1px solid #f0f0f0;border-left:none">
            <p style="margin:0;font-size:16px">&#x1F504;</p>
            <p style="margin:4px 0 0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase">Easy Returns</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA button -->
  <tr>
    <td style="padding:0 40px 40px;text-align:center">
      <a href="${frontendUrl}/products" style="display:inline-block;background:#121212;color:#ffffff;padding:16px 48px;text-decoration:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px">
        Shop the Collection
      </a>
    </td>
  </tr>

</table>
<!-- End main card -->

<!-- Footer -->
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr>
    <td style="padding:24px 40px;text-align:center">
      <p style="margin:0 0 8px;font-size:11px;color:#999">
        <a href="${frontendUrl}" style="color:#999;text-decoration:none">earthrevibe.com</a>
        &nbsp;&bull;&nbsp;
        <a href="https://instagram.com/earthrevibe" style="color:#999;text-decoration:none">Instagram</a>
      </p>
      <p style="margin:0;font-size:10px;color:#ccc">
        EST. 2024 &mdash; India &nbsp;|&nbsp; Vacation-ready fashion for the culture
      </p>
    </td>
  </tr>
</table>

</td></tr></table>
</body></html>
        `,
      });
      logger.info({ email }, 'Newsletter discount email sent');
    } else {
      logger.info({ email }, 'Newsletter signup (Resend not configured, email logged)');
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Newsletter subscribe failed');
    res.status(500).json({
      success: false,
      error: { code: 'SUBSCRIBE_FAILED', message: 'Failed to subscribe' },
    });
  }
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/addresses', addressRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/shipping', shippingRouter);
app.use('/api/v1/discounts', discountRouter);
app.use('/api/v1/wishlist', wishlistRouter);
app.use('/api/v1/loyalty', loyaltyRouter);
app.use('/api/v1/referrals', referralRouter);
app.use('/api/v1/blog', blogRouter);
app.use('/api/v1/support', supportRouter);
app.use('/api/v1/admin/orders', adminOrderRouter);
app.use('/api/v1/admin/customers', adminCustomerRouter);
app.use('/api/v1/admin/blog', adminBlogRouter);
app.use('/api/v1/admin/support', adminSupportRouter);
app.use('/api/v1/admin/analytics', analyticsRouter);
app.use('/api/v1/admin/discounts', adminDiscountRouter);
app.use('/api/v1/admin/inventory', adminInventoryRouter);
app.use('/api/v1/admin/products', adminProductRouter);
app.use('/api/v1/admin/notifications', adminNotificationRouter);
app.use('/api/v1/admin/settings', adminSettingsRouter);
app.use('/api/v1/admin/homepage', adminHomepageRouter);
app.use('/api/v1/homepage', homepageRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/travel-applications', travelApplicationRouter);
app.use('/api/v1/admin/travel-applications', adminTravelApplicationRouter);

// Sentry error handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Error handling (must be after all routes)
app.use(errorHandler);

export { app };
