import { rateLimit } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

// OTP send: 5 per 15 minutes per IP
export const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many OTP requests. Please try again later.',
    },
  },
});
