import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';
import { pickVariant, recordVariantSend } from './whatsapp-template-variant.service';

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

  // The `approved` template has a third body variable for the community
  // WhatsApp invite link. `rejected` and `waitlisted` still take 2 params.
  const bodyParameters: { type: 'text'; text: string }[] = [
    { type: 'text', text: first },
    { type: 'text', text: applicationNumber },
  ];
  if (kind === 'approved') {
    bodyParameters.push({ type: 'text', text: env.COMMUNITY_WHATSAPP_URL });
  }

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
          parameters: bodyParameters,
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
 * Notify the customer that their loyalty redemption is ready via WhatsApp.
 * Uses the pre-approved `WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE`.
 *
 * Important: Meta's India classifier silently drops templates that contain a
 * monetary value + a redeemable code inline (marks them MARKETING regardless
 * of wording). So the template body is a bare UTILITY notification that
 * points customers to earthrevibe.com/account/loyalty where the actual code
 * lives. Only {{1}} = first name is passed to Meta. code + amount are still
 * logged on our side for traceability.
 *
 * Template body (must be approved in Meta Business Manager):
 *   "Hi {{1}}, your loyalty redemption request has been processed. View the
 *    details on your account: earthrevibe.com/account/loyalty"
 *
 *   {{1}} = customer first name
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
          parameters: [{ type: 'text', text: firstName || 'there' }],
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

    const bodyText = await res.text();

    if (!res.ok) {
      logger.error(
        {
          status: res.status,
          body: bodyText,
          code,
          to,
          templateName: env.WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE,
        },
        'WhatsApp loyalty code send error'
      );
      return false;
    }

    // Capture Meta's message ID + wa_id so we can trace each send in
    // Business Manager → WhatsApp → Insights. "200 accepted" is not the
    // same as "delivered" — template propagation, category rules, or recipient
    // settings can still drop the message silently.
    let messageId: string | undefined;
    let waId: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as {
        messages?: { id: string }[];
        contacts?: { wa_id: string }[];
      };
      messageId = parsed.messages?.[0]?.id;
      waId = parsed.contacts?.[0]?.wa_id;
    } catch {
      // bodyText is still logged below
    }

    logger.info(
      {
        code,
        amount,
        to,
        messageId,
        wa_id: waId,
        templateName: env.WHATSAPP_LOYALTY_REDEMPTION_TEMPLATE,
        rawResponse: bodyText,
      },
      'WhatsApp loyalty code sent'
    );
    return true;
  } catch (err) {
    logger.error({ err, code }, 'WhatsApp loyalty code network error');
    return false;
  }
}

/**
 * Send a MARKETING-category trip announcement to a single recipient via
 * WhatsApp Cloud API. Used by the broadcast service; the caller is responsible
 * for loop control, concurrency, and aggregate reporting.
 *
 * Template resolution:
 *   - templateName arg overrides env.WHATSAPP_TRIP_ANNOUNCEMENT_TEMPLATE
 *   - bodyParams is passed positionally: params[0] -> {{1}}, params[1] -> {{2}}, ...
 *   - buttonUrlParam (optional) is appended as a URL-button dynamic suffix
 *     (index 0). Template must declare a dynamic URL button for this to work.
 *
 * Returns detailed per-call result — the broadcast service logs aggregates.
 */
export async function sendWhatsAppTripAnnouncement(args: {
  phone: string;
  bodyParams: string[];
  buttonUrlParam?: string;
  templateName?: string;
  languageCode?: string;
}): Promise<{ ok: boolean; status: number; messageId?: string; error?: string }> {
  const digits = args.phone.replace(/\D/g, '');
  const to = /^\d{10}$/.test(digits) ? `91${digits}` : digits;
  if (!to) return { ok: false, status: 0, error: 'invalid_phone' };

  const templateName = args.templateName ?? env.WHATSAPP_TRIP_ANNOUNCEMENT_TEMPLATE;
  const languageCode = args.languageCode ?? env.WHATSAPP_TRIP_ANNOUNCEMENT_LANG;

  // Meta rejects a body component with empty parameters for zero-variable
  // templates. Omit the body component entirely when there are no params.
  const components: unknown[] = [];
  if (args.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: args.bodyParams.map((t) => ({ type: 'text', text: t })),
    });
  }
  if (args.buttonUrlParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: args.buttonUrlParam }],
    });
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
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
    const bodyText = await res.text();

    if (!res.ok) {
      logger.error(
        { status: res.status, body: bodyText, to, templateName, languageCode },
        'WhatsApp trip announcement error'
      );
      return { ok: false, status: res.status, error: bodyText.slice(0, 500) };
    }

    let messageId: string | undefined;
    let waId: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as {
        messages?: { id: string; message_status?: string }[];
        contacts?: { wa_id: string; input?: string }[];
      };
      messageId = parsed.messages?.[0]?.id;
      waId = parsed.contacts?.[0]?.wa_id;
    } catch {
      // ignored
    }
    // Meta's 200 response = "accepted for delivery", NOT delivered. The
    // rawResponse is the ground truth for tracing silent drops — search
    // Railway logs by messageId to reconstruct delivery history.
    const masked = to.length >= 6 ? to.slice(0, 4) + '****' + to.slice(-2) : to;
    logger.info(
      { to: masked, templateName, languageCode, messageId, wa_id: waId, rawResponse: bodyText },
      'WhatsApp trip announcement accepted by Meta'
    );
    return { ok: true, status: res.status, messageId };
  } catch (err) {
    logger.error({ err, to, templateName }, 'WhatsApp trip announcement network error');
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'network_error' };
  }
}

/**
 * Notify the ops team via WhatsApp when a new order is placed. Reuses the
 * same TRIP_FORM_NOTIFY_PHONE so all transactional business alerts land on
 * one team number. Requires the `er_new_order_alert` template (or override
 * via WHATSAPP_NEW_ORDER_TEMPLATE) to be approved under Utility category.
 *
 * Template body (3 vars):
 *   {{1}} = orderNumber
 *   {{2}} = customerName (first name)
 *   {{3}} = totalAmount (already formatted, e.g. "2,499")
 *
 * Suggested approved body:
 *   "🔔 New order {{1}} — {{2}} placed an order for ₹{{3}}. Check admin for details."
 *
 * Soft-fail: returns boolean, never throws.
 */
export async function sendWhatsAppNewOrderAdminAlert(args: {
  orderNumber: string;
  customerFirstName: string;
  totalAmountFormatted: string;
}): Promise<boolean> {
  const targetPhone = env.TRIP_FORM_NOTIFY_PHONE;
  if (!targetPhone) {
    logger.warn('TRIP_FORM_NOTIFY_PHONE not set — skipping WhatsApp new-order alert');
    return false;
  }
  const to = targetPhone.replace(/^\+/, '');

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.WHATSAPP_NEW_ORDER_TEMPLATE,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: args.orderNumber },
            { type: 'text', text: args.customerFirstName || 'Customer' },
            { type: 'text', text: args.totalAmountFormatted },
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
        { status: res.status, body: text, orderNumber: args.orderNumber },
        'WhatsApp new-order admin alert error'
      );
      return false;
    }
    logger.info({ orderNumber: args.orderNumber }, 'WhatsApp new-order admin alert sent');
    return true;
  } catch (err) {
    logger.error(
      { err, orderNumber: args.orderNumber },
      'WhatsApp new-order admin alert network error'
    );
    return false;
  }
}

/**
 * Send a UTILITY-category "trip opening" update to a single applicant.
 * Each recipient has a pre-existing TravelApplication row (transactional
 * hook required by Meta's Utility guidelines).
 *
 * Template body (3 vars):
 *   {{1}} = applicant first name
 *   {{2}} = application number (e.g. ER-2026-0042)
 *   {{3}} = trip label (e.g. "Ahmedabad weekender")
 *
 * Button: dynamic URL suffix → https://earthrevibe.info/application/{{1}}
 *   {{1}} = applicationNumber (makes each recipient's CTA unique)
 */
export async function sendWhatsAppTripOpening(args: {
  phone: string;
  firstName: string;
  applicationNumber: string;
  tripLabel: string;
  templateName?: string;
  languageCode?: string;
}): Promise<{ ok: boolean; status: number; messageId?: string; error?: string }> {
  const digits = args.phone.replace(/\D/g, '');
  const to = /^\d{10}$/.test(digits) ? `91${digits}` : digits;
  if (!to) return { ok: false, status: 0, error: 'invalid_phone' };

  const templateName = args.templateName ?? env.WHATSAPP_TRIP_OPENING_TEMPLATE;
  const languageCode = args.languageCode ?? env.WHATSAPP_TRIP_OPENING_LANG;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: args.firstName || 'there' },
            { type: 'text', text: args.applicationNumber },
            { type: 'text', text: args.tripLabel },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: args.applicationNumber }],
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
    const bodyText = await res.text();

    if (!res.ok) {
      logger.error(
        { status: res.status, body: bodyText, to, templateName, languageCode },
        'WhatsApp trip opening error'
      );
      return { ok: false, status: res.status, error: bodyText.slice(0, 500) };
    }

    let messageId: string | undefined;
    let waId: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as {
        messages?: { id: string }[];
        contacts?: { wa_id: string }[];
      };
      messageId = parsed.messages?.[0]?.id;
      waId = parsed.contacts?.[0]?.wa_id;
    } catch {
      // ignored
    }
    const masked = to.length >= 6 ? to.slice(0, 4) + '****' + to.slice(-2) : to;
    logger.info(
      {
        to: masked,
        templateName,
        languageCode,
        applicationNumber: args.applicationNumber,
        messageId,
        wa_id: waId,
      },
      'WhatsApp trip opening accepted by Meta'
    );
    return { ok: true, status: res.status, messageId };
  } catch (err) {
    logger.error({ err, to, templateName }, 'WhatsApp trip opening network error');
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'network_error' };
  }
}

/**
 * Send an abandoned cart recovery message via WhatsApp Cloud API.
 * Uses the pre-approved "earth_revibe_abandoned_cart" template.
 *
 * Returns a structured result so the caller can distinguish transient failures
 * (network/5xx — safe to retry next cycle) from permanent ones (invalid phone,
 * paused template, recipient opted out — no point retrying). The cron uses
 * this to decide whether to mark the cart as "sent" or leave it for retry.
 *
 * @param phone       Phone in any common form ("+919876543210", "9876543210",
 *                    "+91 98765 43210"). Normalized internally to digits-only
 *                    with a 91 prefix for bare 10-digit Indian numbers.
 * @param firstName   Customer's first name (template {{1}})
 * @param cartItems   Comma-separated product names (template {{2}})
 */
export async function sendWhatsAppAbandonedCart(
  phone: string,
  firstName: string,
  cartItems: string
): Promise<{ ok: boolean; retryable: boolean; status: number; messageId?: string }> {
  // Normalize phone the same way every other transactional helper here does.
  const digits = phone.replace(/\D/g, '');
  const to = /^\d{10}$/.test(digits) ? `91${digits}` : digits;
  const masked = to.length >= 6 ? to.slice(0, 4) + '****' + to.slice(-2) : to;

  // Empty/garbage phone — permanent, not worth retrying.
  if (!to) {
    logger.warn({ phone: masked }, 'WhatsApp abandoned cart: invalid phone, skipping');
    return { ok: false, retryable: false, status: 0 };
  }

  // PR 8: pick a Meta-approved template variant if any are configured for
  // this template key. Falls back to the hardcoded default so absence of
  // variant rows doesn't break sending. The variantKey is recorded against
  // the resulting messageId for funnel analytics.
  const picked = await pickVariant('ABANDONED_CART_RECOVERY');
  const templateName = picked?.templateName ?? 'earth_revibe_abandoned_cart';

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: firstName || 'there' },
            { type: 'text', text: cartItems },
          ],
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
    // Network / DNS / timeout — definitely retryable.
    logger.error({ err, phone: masked }, 'WhatsApp abandoned cart network error');
    return { ok: false, retryable: true, status: 0 };
  }

  const bodyText = await res.text();

  if (!res.ok) {
    logger.error(
      { status: res.status, body: bodyText, phone: masked },
      'WhatsApp abandoned cart API error'
    );
    // Retryability:
    //   - 5xx = transient on Meta's side
    //   - 429 = rate-limited (per-second cap or daily tier ceiling — refreshes)
    //   - Meta's documented rate-limit error codes inside a 4xx body:
    //       80007  = rate limit hit
    //       130429 = rate limit hit (some Graph API surfaces use this)
    //       131048 = spam rate limit hit (per-recipient cooldown — also
    //                refreshes, treat as transient)
    //   - Other 4xx = permanent (bad phone, template paused, recipient
    //     blocked, language mismatch). Don't retry — same payload would fail.
    let retryable = res.status >= 500 || res.status === 429;
    if (!retryable && res.status >= 400 && res.status < 500) {
      try {
        const parsed = JSON.parse(bodyText) as {
          error?: { code?: number; error_subcode?: number };
        };
        const code = parsed.error?.code;
        const subcode = parsed.error?.error_subcode;
        if (code === 80007 || code === 130429 || code === 131048) retryable = true;
        if (subcode === 2494055) retryable = true; // recipient cap
      } catch {
        // ignore — keep retryable=false on unparseable bodies
      }
    }
    return { ok: false, retryable, status: res.status };
  }

  let messageId: string | undefined;
  let waId: string | undefined;
  try {
    const parsed = JSON.parse(bodyText) as {
      messages?: { id: string }[];
      contacts?: { wa_id: string }[];
    };
    messageId = parsed.messages?.[0]?.id;
    waId = parsed.contacts?.[0]?.wa_id;
  } catch {
    // bodyText is still logged below.
  }

  logger.info(
    {
      phone: masked,
      messageId,
      wa_id: waId,
      templateName,
      variantKey: picked?.variantKey,
      rawResponse: bodyText,
    },
    'WhatsApp abandoned cart message accepted by Meta'
  );

  if (messageId && picked) {
    await recordVariantSend({
      messageId,
      waId,
      templateKey: picked.templateKey,
      variantKey: picked.variantKey,
    });
  }

  return { ok: true, retryable: false, status: res.status, messageId };
}
