import * as Sentry from "@sentry/node";
import express, { type Express } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { APP_CONSTANTS } from "./config/constants";
import { errorHandler } from "./middleware/error-handler";
import { auditLog } from "./middleware/audit-log";
import { authRouter } from "./routes/auth.routes";
import { productRouter } from "./routes/product.routes";
import { categoryRouter } from "./routes/category.routes";
import { searchRouter } from "./routes/search.routes";
import { cartRouter } from "./routes/cart.routes";
import { addressRouter } from "./routes/address.routes";
import { orderRouter } from "./routes/order.routes";
import { checkoutRouter } from "./routes/checkout.routes";
import { shippingRouter } from "./routes/shipping.routes";
import { discountRouter } from "./routes/discount.routes";
import { adminOrderRouter } from "./routes/admin-order.routes";
import { adminCustomerRouter } from "./routes/admin-customer.routes";
import { wishlistRouter } from "./routes/wishlist.routes";
import { loyaltyRouter } from "./routes/loyalty.routes";
import { referralRouter } from "./routes/referral.routes";
import { blogRouter } from "./routes/blog.routes";
import { adminBlogRouter } from "./routes/admin-blog.routes";
import { supportRouter } from "./routes/support.routes";
import { adminSupportRouter } from "./routes/admin-support.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { adminDiscountRouter } from "./routes/admin-discount.routes";
import { adminInventoryRouter } from "./routes/admin-inventory.routes";
import { adminProductRouter } from "./routes/admin-product.routes";
import { adminNotificationRouter } from "./routes/admin-notification.routes";
import { adminSettingsRouter } from "./routes/admin-settings.routes";
import { adminHomepageRouter } from "./routes/admin-homepage.routes";
import { homepageRouter } from "./routes/homepage.routes";
import { uploadRouter } from "./routes/upload.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { sanitize } from "./middleware/sanitize";

const app: Express = express();

// Trust proxy (Railway sits behind a reverse proxy)
app.set("trust proxy", 1);

// Structured request logging
app.use(pinoHttp({ logger }));

// Audit logging for mutating requests (POST, PUT, PATCH, DELETE)
app.use(auditLog);

// Compression
app.use(compression());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = [
      env.FRONTEND_URL,
      env.ADMIN_URL,
      // Production custom domains (both www and non-www)
      "https://earthrevibe.com",
      "https://www.earthrevibe.com",
    ].filter(Boolean);

    // Exact match or Vercel preview URLs for our apps
    if (
      allowed.includes(origin) ||
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }

    // In development, allow localhost on any port
    if (env.NODE_ENV === "development" && origin.startsWith("http://localhost")) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  exposedHeaders: ["X-Export-Truncated", "X-Export-Total", "X-Export-Count"],
}));

// Cookie parsing
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization
app.use(sanitize);

// Rate limiting — per IP.
// Public GET endpoints (products, categories, homepage, blog, search) are exempt
// because Indian mobile carriers use CGNAT — thousands of subscribers share one
// public IP, so they collectively exhaust a per-IP bucket almost immediately.
// Mutations (POST/PUT/DELETE) and sensitive flows (auth, checkout) remain limited.
const PUBLIC_GET_PATHS = /^\/api\/v1\/(products|categories|homepage|blog|search)(\/|$|\?)/;

app.use(rateLimit({
  windowMs: APP_CONSTANTS.RATE_LIMIT_WINDOW_MS,
  limit: APP_CONSTANTS.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "GET" && PUBLIC_GET_PATHS.test(req.path),
}));

// Health check — verify DB connectivity
app.get("/api/v1/health", async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    const { prisma } = await import("@earth-revibe/db");
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "unavailable";
  }

  const healthy = checks.database === "ok";

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "Earth Revibe API is running" : "Service degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Cleanup stale pending checkouts, restore reserved stock, and purge expired idempotency keys
app.post("/api/v1/internal/cleanup", async (_req, res) => {
  try {
    const { prisma } = await import("@earth-revibe/db");
    const { restoreExpiredReservations } = await import("./services/checkout.service.js");

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
      { restoredCount, checkoutsDeleted: result.count, idempotencyKeysDeleted: idempotencyResult.count },
      "Cleanup completed"
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
    logger.error({ err }, "Cleanup failed");
    res.status(500).json({ success: false, error: { code: "CLEANUP_FAILED", message: "Cleanup failed" } });
  }
});

// API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/addresses", addressRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/checkout", checkoutRouter);
app.use("/api/v1/shipping", shippingRouter);
app.use("/api/v1/discounts", discountRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/loyalty", loyaltyRouter);
app.use("/api/v1/referrals", referralRouter);
app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/support", supportRouter);
app.use("/api/v1/admin/orders", adminOrderRouter);
app.use("/api/v1/admin/customers", adminCustomerRouter);
app.use("/api/v1/admin/blog", adminBlogRouter);
app.use("/api/v1/admin/support", adminSupportRouter);
app.use("/api/v1/admin/analytics", analyticsRouter);
app.use("/api/v1/admin/discounts", adminDiscountRouter);
app.use("/api/v1/admin/inventory", adminInventoryRouter);
app.use("/api/v1/admin/products", adminProductRouter);
app.use("/api/v1/admin/notifications", adminNotificationRouter);
app.use("/api/v1/admin/settings", adminSettingsRouter);
app.use("/api/v1/admin/homepage", adminHomepageRouter);
app.use("/api/v1/homepage", homepageRouter);
app.use("/api/v1/upload", uploadRouter);
app.use("/api/v1/webhooks", webhookRouter);

// Sentry error handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Error handling (must be after all routes)
app.use(errorHandler);

export { app };
