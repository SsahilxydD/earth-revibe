import express, { type Express } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
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
import { uploadRouter } from "./routes/upload.routes";
import { sanitize } from "./middleware/sanitize";

const app: Express = express();

// Trust proxy (Railway sits behind a reverse proxy)
app.set("trust proxy", 1);

// Compression
app.use(compression());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = [env.FRONTEND_URL, env.ADMIN_URL].filter(Boolean);

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
}));

// Cookie parsing
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization
app.use(sanitize);

// Rate limiting — 1000 requests per 15 minutes per IP (storefront makes 5-10 requests per page load)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
}));

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "Earth Revibe API is running",
    timestamp: new Date().toISOString(),
    version: "3e9f8a3", // deploy marker — remove after debugging
    supabaseConfigured: !!env.SUPABASE_URL,
  });
});

// Cleanup stale pending checkouts (older than 2 hours) — can be called by cron/external monitor
app.post("/api/v1/internal/cleanup", async (_req, res) => {
  try {
    const { prisma } = await import("@earth-revibe/db");
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await prisma.pendingCheckout.deleteMany({
      where: { createdAt: { lt: twoHoursAgo } },
    });
    res.json({ success: true, data: { deletedCount: result.count } });
  } catch {
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
app.use("/api/v1/upload", uploadRouter);

// Error handling (must be after all routes)
app.use(errorHandler);

export { app };
