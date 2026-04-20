import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';

const PIXEL_ID = env.META_PIXEL_ID;
const API_VERSION = 'v21.0';

interface MetaEventData {
  event_name: string;
  event_time: number;
  action_source: 'website';
  user_data: {
    em?: string[]; // hashed email
    ph?: string[]; // hashed phone
    client_ip_address?: string;
    client_user_agent?: string;
    external_id?: string[];
  };
  custom_data?: Record<string, unknown>;
  event_source_url?: string;
}

function hashSHA256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Send a server-side event to Meta Conversions API.
 * This runs alongside the client-side pixel to improve attribution
 * and capture events missed by ad blockers / iOS privacy restrictions.
 */
export async function sendMetaEvent(params: {
  eventName: string;
  email?: string;
  phone?: string;
  userId?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: string;
  numItems?: number;
  orderId?: string;
}): Promise<void> {
  const token = env.META_CONVERSIONS_API_TOKEN;
  if (!token) {
    logger.warn({ event: params.eventName }, 'Meta CAPI skipped — no token configured');
    return;
  }
  logger.info({ event: params.eventName, orderId: params.orderId }, 'Meta CAPI send start');

  const eventData: MetaEventData = {
    event_name: params.eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: {},
  };

  // Hash PII before sending (Meta requires SHA-256 hashing)
  if (params.email) {
    eventData.user_data.em = [hashSHA256(params.email)];
  }
  if (params.phone) {
    eventData.user_data.ph = [hashSHA256(params.phone)];
  }
  if (params.userId) {
    eventData.user_data.external_id = [hashSHA256(params.userId)];
  }

  // Custom data for e-commerce events
  const customData: Record<string, unknown> = {};
  if (params.value !== undefined) customData.value = params.value;
  if (params.currency) customData.currency = params.currency;
  if (params.contentIds) customData.content_ids = params.contentIds;
  if (params.contentType) customData.content_type = params.contentType;
  if (params.numItems !== undefined) customData.num_items = params.numItems;
  if (params.orderId) customData.order_id = params.orderId;

  if (Object.keys(customData).length > 0) {
    eventData.custom_data = customData;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [eventData] }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body, event: params.eventName }, 'Meta CAPI error');
    } else {
      const body = await res.text();
      logger.info({ event: params.eventName, orderId: params.orderId, response: body }, 'Meta CAPI sent');
    }
  } catch (err) {
    logger.error({ err }, 'Meta Conversions API request failed');
  }
}
