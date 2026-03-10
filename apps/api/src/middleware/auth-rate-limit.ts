import { rateLimit } from "express-rate-limit";

// Login: 15 attempts per 15 minutes per IP
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
});

// Register: 3 per hour per IP
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many registration attempts. Please try again later.",
    },
  },
});

// Password reset: 3 per hour per IP
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many password reset attempts. Please try again later.",
    },
  },
});
