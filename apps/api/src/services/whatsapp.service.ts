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
      logger.error({ status: res.status, body: text, phone: phone.slice(0, 6) + '****' }, 'WhatsApp abandoned cart API error');
      return false;
    }

    logger.info({ phone: phone.slice(0, 6) + '****' }, 'WhatsApp abandoned cart message sent');
    return true;
  } catch (err) {
    logger.error({ err, phone: phone.slice(0, 6) + '****' }, 'WhatsApp abandoned cart network error');
    return false;
  }
}
