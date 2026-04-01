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
