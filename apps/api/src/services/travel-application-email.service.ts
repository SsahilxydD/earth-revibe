import { env } from '../config/env';
import { logger } from '../config/logger';
import { getResend } from '../config/resend';

/**
 * Travel Circle decision emails. Separate from the general email.service
 * (which uses SMTP/nodemailer) because these go through Resend — same
 * transport as newsletter + abandoned-cart emails. Soft-fail: never throws.
 */

const FROM = env.RESEND_FROM_EMAIL || 'Earth Revibe <noreply@earthrevibe.com>';
const FRONTEND_URL = env.FRONTEND_URL.replace(/\/$/, '');

interface DecisionEmailInput {
  to: string;
  name: string;
  applicationNumber: string;
}

function envelope(headerCopy: string, bodyHtml: string, ctaLabel: string, ctaHref: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2ede3;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede3;padding:48px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%">
      <!-- Header -->
      <tr><td style="background:#1a1714;padding:44px 40px 36px;text-align:center">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:5px;color:rgba(242,237,227,0.5);text-transform:uppercase">Earth Revibe</p>
        <p style="margin:0;font-size:12px;letter-spacing:3px;color:#b85c38;text-transform:uppercase">Travel Circle</p>
      </td></tr>

      <!-- Headline -->
      <tr><td style="padding:44px 40px 8px;text-align:center">
        ${headerCopy}
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:16px 40px 32px">
        ${bodyHtml}
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:0 40px 48px;text-align:center">
        <a href="${ctaHref}" style="display:inline-block;background:#1a1714;color:#f2ede3;padding:14px 40px;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase">${ctaLabel}</a>
      </td></tr>
    </table>

    <!-- Footer -->
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="padding:24px 40px;text-align:center">
        <p style="margin:0;font-size:11px;color:#8c8273;line-height:1.6">
          You applied to Earth Revibe's Travel Circle<br>
          <a href="${FRONTEND_URL}" style="color:#8c8273;text-decoration:none">earthrevibe.com</a>
          &nbsp;&bull;&nbsp;
          <a href="https://instagram.com/earthrevibe" style="color:#8c8273;text-decoration:none">@earthrevibe</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

async function send(
  to: string,
  subject: string,
  html: string,
  applicationNumber: string
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    logger.warn({ applicationNumber }, 'Resend not configured — skipping decision email');
    return false;
  }

  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    logger.info({ applicationNumber, to }, 'Decision email sent');
    return true;
  } catch (err) {
    logger.error({ err, applicationNumber, to }, 'Resend decision email failed');
    return false;
  }
}

// ── Approval ────────────────────────────────────────────────────────────────
export async function sendApprovalEmail(input: DecisionEmailInput): Promise<boolean> {
  const { to, name, applicationNumber } = input;
  const first = firstName(name);

  const headerCopy = `
    <h1 style="margin:0 0 8px;font-size:32px;font-weight:300;letter-spacing:-0.5px;color:#1a1714">
      Welcome in, ${first}.
    </h1>
    <p style="margin:0;font-size:12px;letter-spacing:2px;color:#b85c38;text-transform:uppercase">
      You're in the circle
    </p>`;

  const body = `
    <p style="font-size:15px;line-height:1.7;color:#4a4239;margin:0 0 20px">
      We read every single application. Yours made it through &mdash; welcome to the travel circle. 🎒
    </p>
    <p style="font-size:15px;line-height:1.7;color:#4a4239;margin:0 0 20px">
      Here's what happens next:
    </p>
    <ol style="font-size:14px;line-height:1.9;color:#4a4239;margin:0 0 24px;padding-left:20px">
      <li>We'll add you to the private WhatsApp travel circle within 48 hours.</li>
      <li>Trip drops land there first &mdash; dates, locations, vibes.</li>
      <li>First trip for you? We'll help you pick the right one.</li>
    </ol>
    <p style="font-size:13px;line-height:1.7;color:#6e665b;margin:0;padding:16px;background:#f2ede3;border-left:3px solid #b85c38">
      <strong>Application #${applicationNumber}</strong> &bull; Keep this handy for reference.
    </p>`;

  return send(
    to,
    `You're in — welcome to Earth Revibe's Travel Circle`,
    envelope(headerCopy, body, 'Explore earthrevibe.com', FRONTEND_URL),
    applicationNumber
  );
}

// ── Waitlist ────────────────────────────────────────────────────────────────
export async function sendWaitlistEmail(input: DecisionEmailInput): Promise<boolean> {
  const { to, name, applicationNumber } = input;
  const first = firstName(name);

  const headerCopy = `
    <h1 style="margin:0 0 8px;font-size:32px;font-weight:300;letter-spacing:-0.5px;color:#1a1714">
      You're close, ${first}.
    </h1>
    <p style="margin:0;font-size:12px;letter-spacing:2px;color:#b85c38;text-transform:uppercase">
      On the waitlist
    </p>`;

  const body = `
    <p style="font-size:15px;line-height:1.7;color:#4a4239;margin:0 0 20px">
      Good news: you made it past the first round. We liked your energy.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#4a4239;margin:0 0 20px">
      Each trip caps at ~30% of applicants to keep group dynamics right, so we're holding your spot on the waitlist. The moment a place opens up, we'll reach out &mdash; usually within a trip cycle.
    </p>
    <p style="font-size:13px;line-height:1.7;color:#6e665b;margin:0;padding:16px;background:#f2ede3;border-left:3px solid #b85c38">
      <strong>Application #${applicationNumber}</strong> &bull; We'll write back personally when a spot opens.
    </p>`;

  return send(
    to,
    `You're on the Earth Revibe Travel Circle waitlist`,
    envelope(headerCopy, body, "See what we're up to", FRONTEND_URL),
    applicationNumber
  );
}

// ── Rejection ───────────────────────────────────────────────────────────────
export async function sendRejectionEmail(input: DecisionEmailInput): Promise<boolean> {
  const { to, name, applicationNumber } = input;
  const first = firstName(name);

  const headerCopy = `
    <h1 style="margin:0 0 8px;font-size:32px;font-weight:300;letter-spacing:-0.5px;color:#1a1714">
      Thanks for sharing, ${first}.
    </h1>
    <p style="margin:0;font-size:12px;letter-spacing:2px;color:#b85c38;text-transform:uppercase">
      Not this round
    </p>`;

  const body = `
    <p style="font-size:15px;line-height:1.7;color:#4a4239;margin:0 0 20px">
      We spent real time with your application, and it's not a fit for this trip cycle. That's on us and the group chemistry, not on you.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#4a4239;margin:0 0 20px">
      We'd genuinely love to have you try again when the next round opens &mdash; different trips bring out different energy, and the right one could be just one cycle away.
    </p>
    <p style="font-size:15px;line-height:1.7;color:#4a4239;margin:0 0 24px">
      In the meantime, keep an eye on <a href="https://instagram.com/earthrevibe" style="color:#b85c38;text-decoration:none">@earthrevibe</a> for trip drops, stories from the circle, and the odd community meet-up.
    </p>
    <p style="font-size:13px;line-height:1.7;color:#6e665b;margin:0;padding:16px;background:#f2ede3;border-left:3px solid #6e665b">
      <strong>Application #${applicationNumber}</strong> &bull; Reply to this email any time &mdash; we read everything.
    </p>`;

  return send(
    to,
    `A thoughtful update on your Earth Revibe application`,
    envelope(headerCopy, body, "Shop the SS'26 drop", `${FRONTEND_URL}/products`),
    applicationNumber
  );
}
