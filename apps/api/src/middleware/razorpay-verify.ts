import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { logger } from "../config/logger";

/**
 * Middleware to verify Razorpay server-to-server callback signatures.
 * Used on Magic Checkout endpoints (shipping-info, promotions, promotions/apply).
 *
 * Magic Checkout callbacks are signed with the Key Secret,
 * while webhooks use a separate Webhook Secret.
 * This middleware tries both to handle either case.
 */
export function verifyRazorpayCallback(req: Request, res: Response, next: NextFunction) {
  const secrets = [
    env.RAZORPAY_KEY_SECRET,
    env.RAZORPAY_WEBHOOK_SECRET,
  ].filter(Boolean) as string[];

  if (secrets.length === 0) {
    res.status(500).json({
      success: false,
      error: { code: "CONFIG_ERROR", message: "Razorpay secret not configured" },
    });
    return;
  }

  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    // Some Magic Checkout callbacks may not include a signature —
    // allow through with a warning log
    logger.warn({ path: req.path }, "Razorpay callback missing signature — allowing through");
    next();
    return;
  }

  // Try each secret — Magic Checkout uses Key Secret, webhooks use Webhook Secret
  const body = JSON.stringify(req.body);

  for (const secret of secrets) {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    try {
      const expectedBuf = Buffer.from(expectedSignature, "hex");
      const receivedBuf = Buffer.from(signature, "hex");

      if (expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
        next();
        return;
      }
    } catch {
      // Buffer conversion failed — try next secret
    }
  }

  logger.warn({ path: req.path }, "Razorpay callback signature verification failed");
  res.status(401).json({
    success: false,
    error: { code: "UNAUTHORIZED", message: "Invalid Razorpay signature" },
  });
}
