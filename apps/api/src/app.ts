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

// Error handling (must be after all routes)
app.use(errorHandler);

export { app };
