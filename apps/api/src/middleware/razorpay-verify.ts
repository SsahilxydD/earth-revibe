import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * Middleware to verify Razorpay server-to-server callback signatures.
 * Used on Magic Checkout endpoints (shipping-info, promotions, promotions/apply).
 * Verifies the X-Razorpay-Signature header using HMAC SHA256.
 */
export function verifyRazorpayCallback(req: Request, res: Response, next: NextFunction) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    res.status(500).json({
      success: false,
      error: { code: "CONFIG_ERROR", message: "Razorpay secret not configured" },
    });
    return;
  }

  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing Razorpay signature" },
    });
    return;
  }

  // Compute expected HMAC
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Timing-safe comparison with length guard
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid Razorpay signature" },
    });
    return;
  }

  next();
}
