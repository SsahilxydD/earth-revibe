import { env } from '../config/env';
import { logger } from '../config/logger';
import { getResend } from '../config/resend';
import { sendNewOrderToDiscord, type NewOrderDiscordInput } from './discord.service';
import { sendWhatsAppNewOrderAdminAlert } from './whatsapp.service';

export interface NewOrderAlertInput {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string; // 'razorpay' | 'COD' | ...
  status: string; // PLACED | CONFIRMED
}

function formatAmount(n: number): string {
  // Two-decimal Indian grouping, no currency symbol (template adds ₹).
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

async function sendEmailAdminAlert(input: NewOrderAlertInput): Promise<boolean> {
  const recipientsRaw = env.ORDER_NOTIFY_EMAIL;
  if (!recipientsRaw) {
    logger.warn('ORDER_NOTIFY_EMAIL not set — skipping email order alert');
    return false;
  }
  const recipients = recipientsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (recipients.length === 0) return false;

  const resend = getResend();
  if (!resend) {
    logger.warn('Resend not configured — skipping email order alert');
    return false;
  }

  const adminUrl = env.ADMIN_URL || '';
  const amount = `₹${formatAmount(input.totalAmount)}`;

  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: recipients,
      subject: `🛒 New order ${input.orderNumber} — ${amount}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px 16px;color:#121212">
  <h1 style="font-size:18px;font-weight:700;margin:0 0 16px">New order received</h1>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 0;color:#666">Order</td><td style="padding:6px 0;font-weight:600">${input.orderNumber}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Customer</td><td style="padding:6px 0">${input.customerName || '—'}</td></tr>
    ${input.customerEmail ? `<tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0">${input.customerEmail}</td></tr>` : ''}
    ${input.customerPhone ? `<tr><td style="padding:6px 0;color:#666">Phone</td><td style="padding:6px 0">${input.customerPhone}</td></tr>` : ''}
    <tr><td style="padding:6px 0;color:#666">Total</td><td style="padding:6px 0;font-weight:600">${amount}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Items</td><td style="padding:6px 0">${input.itemCount}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Payment</td><td style="padding:6px 0">${input.paymentMethod}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Status</td><td style="padding:6px 0">${input.status}</td></tr>
  </table>
  ${adminUrl ? `<p style="margin:24px 0 0"><a href="${adminUrl}/orders/${input.orderNumber}" style="display:inline-block;background:#121212;color:#fff;padding:10px 20px;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:1px">View in admin</a></p>` : ''}
</div>`,
    });
    logger.info({ orderNumber: input.orderNumber, recipients }, 'Email order alert sent');
    return true;
  } catch (err) {
    logger.error({ err, orderNumber: input.orderNumber }, 'Email order alert failed');
    return false;
  }
}

/**
 * Fan out a new-order admin alert to all three channels (Discord / WhatsApp /
 * Email) in parallel. Each channel soft-fails independently — failure in one
 * never prevents the others from firing, and nothing here ever throws. Must
 * be safe to call from a checkout fire-and-forget pathway.
 */
export async function notifyAdminOfNewOrder(input: NewOrderAlertInput): Promise<void> {
  const firstName = (input.customerName || '').trim().split(/\s+/)[0] || '';
  const adminOrderUrl = env.ADMIN_URL ? `${env.ADMIN_URL}/orders/${input.orderNumber}` : undefined;

  const discordInput: NewOrderDiscordInput = {
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    totalAmount: input.totalAmount,
    itemCount: input.itemCount,
    paymentMethod: input.paymentMethod,
    status: input.status,
    adminOrderUrl,
  };

  await Promise.all([
    sendNewOrderToDiscord(discordInput).catch((err) =>
      logger.error({ err, orderNumber: input.orderNumber }, 'Discord order alert threw')
    ),
    sendWhatsAppNewOrderAdminAlert({
      orderNumber: input.orderNumber,
      customerFirstName: firstName,
      totalAmountFormatted: formatAmount(input.totalAmount),
    }).catch((err) =>
      logger.error({ err, orderNumber: input.orderNumber }, 'WhatsApp order alert threw')
    ),
    sendEmailAdminAlert(input).catch((err) =>
      logger.error({ err, orderNumber: input.orderNumber }, 'Email order alert threw')
    ),
  ]);
}
