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
app.use(express.json({ limit: '10mb' }));
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

// Cleanup stale pending checkouts, restore reserved stock, and purge expired idempotency keys
app.post('/api/v1/internal/cleanup', async (_req, res) => {
  try {
    const { prisma } = await import('@earth-revibe/db');
    const { restoreExpiredReservations } = await import('./services/checkout.service.js');

    // 1. Restore stock for expired reservations, then delete them
    const restoredCount = await restoreExpiredReservations();

    // 2. Delete remaining non-reserved expired checkouts
    const cutoff = new Date(Date.now() - APP_CONSTANTS.CHECKOUT_EXPIRY_MS);
    const result = await prisma.pendingCheckout.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    // 3. Clean expired idempotency keys
    const idempotencyResult = await prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    logger.info(
      {
        restoredCount,
        checkoutsDeleted: result.count,
        idempotencyKeysDeleted: idempotencyResult.count,
      },
      'Cleanup completed'
    );

    res.json({
      success: true,
      data: {
        reservationsRestored: restoredCount,
        checkoutsDeleted: result.count,
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

    const ph = getPostHog();
    const resend = getResend();

    // Find carts that:
    // 1. Have items in them
    // 2. Were last updated at least 1 hour ago (user isn't actively shopping)
    // 3. Haven't already received an abandoned cart email
    // 4. Belong to users who haven't placed an order in the last 24 hours
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lte: oneHourAgo },
        abandonedEmailSentAt: null,
        items: { some: {} },
        user: {
          orders: {
            none: { createdAt: { gte: twentyFourHoursAgo } },
          },
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
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
    const frontendUrl = env.FRONTEND_URL;

    for (const cart of abandonedCarts) {
      if (!cart.user?.email) continue;

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

      // 2. Mark the cart so we don't send duplicate emails
      await prisma.cart.update({
        where: { id: cart.id },
        data: { abandonedEmailSentAt: new Date() },
      });

      // 3. Fire event to PostHog for analytics dashboards
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
    const guestOneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const guestCarts = await prisma.guestAbandonedCart.findMany({
      where: {
        emailSent: false,
        updatedAt: { lte: guestOneHourAgo },
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

    logger.info({ tracked, emailed, guestEmailed }, 'Abandoned cart detection completed');
    res.json({ success: true, data: { tracked, emailed, guestEmailed } });
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
    if (resend) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Earth Revibe <noreply@earthrevibe.com>',
        to: email,
        subject: "Welcome! Here's 15% off your first order",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff">
            <div style="text-align:center;margin-bottom:32px">
              <p style="font-size:18px;font-weight:600;letter-spacing:2px;color:#000;margin:0">EARTH REVIBE</p>
            </div>
            <h2 style="font-size:20px;font-weight:700;color:#000;margin:0 0 16px;text-align:center">Welcome to the Culture</h2>
            <p style="color:#666;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px">
              Thanks for joining! As promised, here's your exclusive discount code for 15% off your first order:
            </p>
            <div style="text-align:center;margin:24px 0">
              <div style="display:inline-block;background:#000;color:#fff;padding:16px 40px;font-size:24px;font-weight:700;letter-spacing:4px;border-radius:8px">
                EARTH15OFF
              </div>
            </div>
            <p style="color:#999;font-size:13px;text-align:center;margin:24px 0 0">
              Apply it at checkout. No minimum order. Free shipping on all orders.
            </p>
            <div style="text-align:center;margin:32px 0 0">
              <a href="${env.FRONTEND_URL}/products" style="display:inline-block;background:#000;color:#fff;padding:14px 40px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">
                Start Shopping
              </a>
            </div>
            <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center">
              <p style="font-size:11px;color:#999;margin:0">Earth Revibe &bull; earthrevibeofficial@gmail.com</p>
            </div>
          </div>
        `,
      });
      logger.info({ email }, 'Newsletter discount email sent');
    } else {
      logger.info({ email }, 'Newsletter signup (Resend not configured, email logged)');
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Newsletter subscribe failed');
    res
      .status(500)
      .json({
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

// Sentry error handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Error handling (must be after all routes)
app.use(errorHandler);

export { app };
