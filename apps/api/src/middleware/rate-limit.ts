import { rateLimit } from "express-rate-limit";

const errorResponse = (message: string) => ({
  success: false,
  error: { code: "RATE_LIMIT_EXCEEDED", message },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: errorResponse("Too many auth attempts. Please try again later."),
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: errorResponse("Too many requests. Please slow down."),
});

export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: errorResponse("Too many checkout attempts. Please try again later."),
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: errorResponse("Too many webhook calls."),
});
