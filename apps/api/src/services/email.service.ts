import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { createCircuitBreaker } from "../utils/circuit-breaker";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn("SMTP not configured -- emails will be logged");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: (env.SMTP_PORT || 587) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

const fromAddress = env.EMAIL_FROM || "earthrevibeofficial@gmail.com";

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;background:#f9f9f9">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;background:#fff">
<div style="text-align:center;margin-bottom:32px">
<p style="font-size:18px;font-weight:600;letter-spacing:2px;color:#000;margin:0">EARTH REVIBE</p>
</div>
${body}
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center">
<p style="font-size:11px;color:#999;margin:0">Earth Revibe &bull; earthrevibeofficial@gmail.com</p>
</div>
</div></body></html>`;
}

async function _sendMailViaSMTP(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.info({ to, subject }, "Email logged (SMTP not configured)");
    return;
  }
  await t.sendMail({ from: `"Earth Revibe" <${fromAddress}>`, to, subject, html, text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() });
}

const emailBreaker = createCircuitBreaker(
  _sendMailViaSMTP,
  "email-smtp",
  { timeout: 15000, resetTimeout: 60000 }
);

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  return emailBreaker.fire(to, subject, html) as Promise<void>;
}

export const emailService = {
  async sendWelcomeEmail(email: string, firstName: string) {
    const html = wrapHtml(`
      <h2 style="font-size:20px;color:#000;margin:0 0 16px">Welcome, ${firstName}!</h2>
      <p style="font-size:14px;line-height:1.7;color:#555">Thank you for joining Earth Revibe. We're glad to have you.</p>
      <p style="font-size:14px;line-height:1.7;color:#555">Use code <strong>WELCOME10</strong> for 10% off your first order.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${env.FRONTEND_URL}/products" style="display:inline-block;padding:12px 32px;background:#000;color:#fff;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase">Shop Now</a>
      </div>
    `);
    await sendEmail(email, "Welcome to Earth Revibe", html);
  },

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = wrapHtml(`
      <h2 style="font-size:20px;color:#000;margin:0 0 16px">Reset Your Password</h2>
      <p style="font-size:14px;line-height:1.7;color:#555">We received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#000;color:#fff;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase">Reset Password</a>
      </div>
      <p style="font-size:12px;color:#999">If you didn't request this, please ignore this email.</p>
    `);
    await sendEmail(email, "Reset Your Password — Earth Revibe", html);
  },

  async sendOrderConfirmation(order: { orderNumber: string; guestEmail?: string | null; subtotal: number; discountAmount: number; shippingCost: number; total: number; items: { name: string; quantity: number; price: number; size?: string }[]; email?: string }) {
    const to = order.email || order.guestEmail;
    if (!to) return;
    const itemRows = order.items.map(i =>
      `<tr><td style="padding:8px 0;font-size:13px;border-bottom:1px solid #f0f0f0">${i.name}${i.size ? ` (${i.size})` : ""}</td><td style="padding:8px 0;font-size:13px;text-align:center;border-bottom:1px solid #f0f0f0">${i.quantity}</td><td style="padding:8px 0;font-size:13px;text-align:right;border-bottom:1px solid #f0f0f0">Rs. ${i.price}</td></tr>`
    ).join("");
    const html = wrapHtml(`
      <h2 style="font-size:20px;color:#000;margin:0 0 4px">Order Confirmed</h2>
      <p style="font-size:13px;color:#888;margin:0 0 24px">Order #${order.orderNumber}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="text-align:left;font-size:11px;color:#999;padding:0 0 8px;text-transform:uppercase;letter-spacing:1px">Item</th><th style="font-size:11px;color:#999;padding:0 0 8px;text-transform:uppercase;letter-spacing:1px">Qty</th><th style="text-align:right;font-size:11px;color:#999;padding:0 0 8px;text-transform:uppercase;letter-spacing:1px">Price</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="margin-top:16px;font-size:13px;color:#555">
        <p style="margin:4px 0">Subtotal: Rs. ${order.subtotal}</p>
        ${order.discountAmount > 0 ? `<p style="margin:4px 0;color:#16a34a">Discount: -Rs. ${order.discountAmount}</p>` : ""}
        <p style="margin:4px 0">Shipping: ${order.shippingCost > 0 ? `Rs. ${order.shippingCost}` : "FREE"}</p>
        <p style="margin:8px 0 0;font-size:15px;font-weight:600;color:#000">Total: Rs. ${order.total}</p>
      </div>
      <p style="font-size:13px;color:#555;margin-top:24px">Estimated delivery: 3-10 business days</p>
    `);
    await sendEmail(to, `Order Confirmed #${order.orderNumber} — Earth Revibe`, html);
  },

  async sendShippingNotification(email: string, orderNumber: string, trackingNumber: string) {
    const html = wrapHtml(`
      <h2 style="font-size:20px;color:#000;margin:0 0 16px">Your Order Has Shipped!</h2>
      <p style="font-size:14px;line-height:1.7;color:#555">Order #${orderNumber} is on its way.</p>
      <p style="font-size:14px;line-height:1.7;color:#555">Tracking Number: <strong>${trackingNumber}</strong></p>
      <div style="text-align:center;margin:28px 0">
        <a href="${env.FRONTEND_URL}/track-order?tracking=${trackingNumber}" style="display:inline-block;padding:12px 32px;background:#000;color:#fff;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase">Track Order</a>
      </div>
    `);
    await sendEmail(email, `Order #${orderNumber} Shipped — Earth Revibe`, html);
  },
};
