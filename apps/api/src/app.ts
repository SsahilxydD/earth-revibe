import express, { type Express } from "express";
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
import { sanitize } from "./middleware/sanitize";

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [env.FRONTEND_URL, env.ADMIN_URL],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization
app.use(sanitize);

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
}));

// Health check
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "Earth Revibe API is running",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/addresses", addressRouter);
app.use("/api/v1/orders", orderRouter);
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

// Error handling (must be after all routes)
app.use(errorHandler);

export { app };
