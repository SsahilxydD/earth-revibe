import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';

const GRAPH_API_URL = `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

/**
 * Send an OTP code via WhatsApp Cloud API using the pre-approved template.
 * @param phone  E.164 phone number (e.g. "+919876543210")
 * @param code   6-digit OTP string
 */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  // WhatsApp API expects the number without the leading "+"
  const to = phone.replace(/^\+/, '');

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.WHATSAPP_TEMPLATE_NAME,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: code }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: code }],
        },
      ],
    },
  };

  let res: Response;
  try {
    res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error({ err }, 'WhatsApp API network error');
    throw ApiError.serviceUnavailable('Unable to send OTP. Please try again later.');
  }

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text }, 'WhatsApp API error');
    throw ApiError.serviceUnavailable('Unable to send OTP. Please try again later.');
  }
}

/** Human-friendly status labels for WhatsApp messages. */
const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Order Placed',
  CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Being Prepared',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Return Received',
  REFUNDED: 'Refunded',
};

/**
 * Send an order status update via WhatsApp Cloud API.
 * Uses the pre-approved template configured in WHATSAPP_ORDER_UPDATE_TEMPLATE.
 *
 * Template parameters:
 *   {{1}} = customer first name
 *   {{2}} = order number
 *   {{3}} = status label (e.g. "Shipped")
 *
 * Soft-fail: returns boolean, never throws — order processing must not be blocked.
 */
export async function sendWhatsAppOrderUpdate(
  phone: string,
  firstName: string,
  orderNumber: string,
  status: string
): Promise<boolean> {
  // Normalize to E.164 without '+': handles +919876543210, 919876543210, and 9876543210
  const digits = phone.replace(/\D/g, '');
  const to = /^\d{10}$/.test(digits) ? `91${digits}` : digits;
  const statusLabel = STATUS_LABELS[status] || status;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.WHATSAPP_ORDER_UPDATE_TEMPLATE,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: firstName || 'there' },
            { type: 'text', text: orderNumber },
            { type: 'text', text: statusLabel },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { status: res.status, body: text, orderNumber },
        'WhatsApp order update API error'
      );
      return false;
    }

    logger.info({ orderNumber, status: statusLabel }, 'WhatsApp order update sent');
    return true;
  } catch (err) {
    logger.error({ err, orderNumber }, 'WhatsApp order update network error');
    return false;
  }
}

/**
 * Notify the team via WhatsApp when a new Travel Circle application is submitted.
 * Uses the pre-approved `WHATSAPP_TRIP_APPLICATION_TEMPLATE` template.
 *
 * Template body (must be approved in Meta Business Manager):
 *   "🎒 New Travel Circle application {{1}}
 *    {{2}} from {{3}} just applied. Check Discord/admin for full details."
 *
 *   {{1}} = applicationNumber (e.g. "ER-2026-0042")
 *   {{2}} = applicant name
 *   {{3}} = city
 *
 * Soft-fail: returns boolean, never throws — notification must not block submission.
 */
export async function sendWhatsAppTripApplicationAlert(
  applicationNumber: string,
  name: string,
  city: string
): Promise<boolean> {
  const targetPhone = env.TRIP_FORM_NOTIFY_PHONE;
  if (!targetPhone) {
    logger.warn('TRIP_FORM_NOTIFY_PHONE not set — skipping WhatsApp application alert');
    return false;
  }
  const to = targetPhone.replace(/^\+/, '');

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.WHATSAPP_TRIP_APPLICATION_TEMPLATE,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: applicationNumber },
            { type: 'text', text: name },
            { type: 'text', text: city },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { status: res.status, body: text, applicationNumber },
        'WhatsApp trip-application alert error'
      );
      return false;
    }

    logger.info({ applicationNumber }, 'WhatsApp trip-application alert sent');
    return true;
  } catch (err) {
    logger.error({ err, applicationNumber }, 'WhatsApp trip-application alert network error');
    return false;
  }
}

/**
 * Acknowledge a Travel Circle application to the APPLICANT the moment the
 * form is submitted. Uses the pre-approved `WHATSAPP_TRIP_RECEIVED_TEMPLATE`.
 *
 * Template body (must be approved in Meta Business Manager):
 *   "Thanks for applying, {{1}}! 🎒 We've got your Earth Revibe Travel
 *    Circle application {{2}} and will review it within 48h."
 *
 *   {{1}} = applicant first name
 *   {{2}} = applicationNumber (e.g. "ER-2026-0042")
 *
 * Soft-fail: returns boolean, never throws.
 */
export async function sendWhatsAppTripApplicationReceived(
  phone: string,
  name: string,
  applicationNumber: string
): Promise<boolean> {
  const digits = phone.replace(/\D/g, '');
  const to = /^\d{10}$/.test(digits) ? `91${digits}` : digits;
  if (!to) return false;

  const first = name.trim().split(/\s+/)[0] || 'there';

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.WHATSAPP_TRIP_RECEIVED_TEMPLATE,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: first },
            { type: 'text', text: applicationNumber },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        {
          status: res.status,
          body: text,
          applicationNumber,
          templateName: env.WHATSAPP_TRIP_RECEIVED_TEMPLATE,
        },
        'WhatsApp trip-application received error'
      );
      return false;
    }

    logger.info({ applicationNumber }, 'WhatsApp trip-application receipt sent');
    return true;
  } catch (err) {
    logger.error({ err, applicationNumber }, 'WhatsApp trip-application received network error');
    return false;
  }
}

/**
 * Send a Travel Circle DECISION message to the applicant (approved /
 * rejected / waitlisted). Uses pre-approved Meta templates configured via
 * env. Soft-fail: returns boolean, never throws.
 *
 * Template body shapes (must be created + approved in Meta Business Manager):
 *   approved   : "Welcome in, {{1}}! 🎒 You're in the Earth Revibe Travel Circle
 *                 — we'll add you to the private WhatsApp group within 48h.
 *                 Application {{2}}."
 *   waitlisted : "Hey {{1}}, you're on the Earth Revibe Travel Circle waitlist.
 *                 We'll reach out the moment a spot opens. Application {{2}}."
 *   rejected   : "Thanks for applying to Earth Revibe, {{1}}. Not this round
 *                 — but we'd love to see you apply again next cycle.
 *                 Application {{2}}."
 *
 * Params: {{1}} = applicant first name, {{2}} = application number.
 */
type DecisionKind = 'approved' | 'rejected' | 'waitlisted';

function templateNameFor(kind: DecisionKind): string {
  switch (kind) {
    case 'approved':
      return env.WHATSAPP_TRIP_APPROVED_TEMPLATE;
    case 'rejected':
      return env.WHATSAPP_TRIP_REJECTED_TEMPLATE;
    case 'waitlisted':
      return env.WHATSAPP_TRIP_WAITLISTED_TEMPLATE;
  }
}

export async function sendWhatsAppDecision(
  kind: DecisionKind,
  phone: string,
  name: string,
  applicationNumber: string
): Promise<boolean> {
  // Normalize phone — strip leading + and any non-digits
  const to = phone.replace(/\D/g, '');
  if (!to) return false;

  const first = name.trim().split(/\s+/)[0] || 'there';

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateNameFor(kind),
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: first },
            { type: 'text', text: applicationNumber },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Meta's Graph API returns 200 on template ACCEPTANCE — delivery can
    // still fail silently (pacing, language mismatch, template not yet
    // propagated). Capture the full response body so we can trace specific
    // messages in Meta's dashboard by the message ID.
    const bodyText = await res.text();
    if (!res.ok) {
      logger.error(
        {
          status: res.status,
          body: bodyText,
          applicationNumber,
          kind,
          to,
          templateName: templateNameFor(kind),
        },
        'WhatsApp decision template error'
      );
      return false;
    }

    let messageId: string | undefined;
    let wabaId: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as {
        messages?: { id: string; message_status?: string }[];
        contacts?: { wa_id: string }[];
      };
      messageId = parsed.messages?.[0]?.id;
      wabaId = parsed.contacts?.[0]?.wa_id;
    } catch {
      // Fall through with undefined IDs — bodyText is still logged below.
    }

    logger.info(
      {
        applicationNumber,
        kind,
        to,
        wa_id: wabaId,
        messageId,
        templateName: templateNameFor(kind),
        rawResponse: bodyText,
      },
      'WhatsApp decision sent'
    );
    return true;
  } catch (err) {
    logger.error({ err, applicationNumber, kind }, 'WhatsApp decision network error');
    return false;
  }
}

/**
 * Send a loyalty redemption code to the customer via WhatsApp Cloud API.
 * Uses the pre-approved `WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE`.
 *
 * Template body (must be approved in Meta Business Manager):
 *   "Hi {{1}} 🎉 Your Earth Revibe loyalty redemption is approved. Use code
 *    {{2}} at checkout for ₹{{3}} off your next order. Valid 60 days, single
 *    use. — earthrevibe.com"
 *
 *   {{1}} = customer first name
 *   {{2}} = redemption code (e.g. ER-RDM-ZSTVWBF)
 *   {{3}} = amount in rupees (e.g. "500")
 *
 * Soft-fail: returns boolean, never throws — email is the fallback.
 */
export async function sendWhatsAppLoyaltyCode(
  phone: string,
  firstName: string,
  code: string,
  amount: number
): Promise<boolean> {
  const digits = phone.replace(/\D/g, '');
  const to = /^\d{10}$/.test(digits) ? `91${digits}` : digits;
  if (!to) return false;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: firstName || 'there' },
            { type: 'text', text: code },
            { type: 'text', text: String(amount) },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { status: res.status, body: text, code, templateName: env.WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE },
        'WhatsApp loyalty code send error'
      );
      return false;
    }

    logger.info({ code, amount }, 'WhatsApp loyalty code sent');
    return true;
  } catch (err) {
    logger.error({ err, code }, 'WhatsApp loyalty code network error');
    return false;
  }
}

/**
 * Send an abandoned cart recovery message via WhatsApp Cloud API.
 * Uses the pre-approved "earth_revibe_abandoned_cart" template.
 * @param phone       E.164 phone number (e.g. "+919876543210")
 * @param firstName   Customer's first name (template {{1}})
 * @param cartItems   Comma-separated product names (template {{2}})
 */
export async function sendWhatsAppAbandonedCart(
  phone: string,
  firstName: string,
  cartItems: string
): Promise<boolean> {
  const to = phone.replace(/^\+/, '');

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: 'earth_revibe_abandoned_cart',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: firstName },
            { type: 'text', text: cartItems },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { status: res.status, body: text, phone: phone.slice(0, 6) + '****' },
        'WhatsApp abandoned cart API error'
      );
      return false;
    }

    logger.info({ phone: phone.slice(0, 6) + '****' }, 'WhatsApp abandoned cart message sent');
    return true;
  } catch (err) {
    logger.error(
      { err, phone: phone.slice(0, 6) + '****' },
      'WhatsApp abandoned cart network error'
    );
    return false;
  }
}
