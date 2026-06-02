import { env } from '../config/env';
import { logger } from '../config/logger';
import type { TravelApplicationSubmitInput } from '@earth-revibe/shared';

// Clay tone from the trip-form design system — matches the brand.
const EMBED_COLOR_CLAY = 0xb85c38;
// Green for successful order events.
const EMBED_COLOR_GREEN = 0x2f9e44;

interface TripApplicationEmbedInput {
  applicationNumber: string;
  data: TravelApplicationSubmitInput;
}

/**
 * Post a rich embed to the Discord webhook for a new Travel Circle application.
 * Soft-fail: logs + returns boolean. Must never throw — submission is already persisted.
 */
export async function sendTripApplicationToDiscord(
  input: TripApplicationEmbedInput
): Promise<boolean> {
  const url = env.DISCORD_TRIP_FORM_WEBHOOK_URL;
  if (!url) {
    logger.warn('DISCORD_TRIP_FORM_WEBHOOK_URL not set — skipping Discord notification');
    return false;
  }

  const { applicationNumber, data } = input;

  const embed = {
    title: `🎒 New Travel Circle application — ${applicationNumber}`,
    color: EMBED_COLOR_CLAY,
    timestamp: new Date().toISOString(),
    fields: [
      { name: 'Name', value: data.name, inline: true },
      { name: 'Age', value: String(data.age), inline: true },
      { name: 'City', value: data.city, inline: true },
      { name: 'Phone', value: data.phone, inline: true },
      { name: 'Email', value: data.email, inline: true },
      { name: 'Instagram', value: data.instagram, inline: true },
      { name: 'Traveler type', value: data.travelerType, inline: true },
      { name: 'Trip preferences', value: data.tripPrefs.join(', '), inline: false },
      { name: 'Travelled before?', value: data.pastTravel, inline: true },
      { name: 'Met before?', value: data.meetBefore, inline: true },
      { name: 'Curated OK?', value: data.curated, inline: true },
      {
        name: 'Why join',
        value: data.whyJoin.length > 1024 ? data.whyJoin.slice(0, 1020) + '…' : data.whyJoin,
      },
    ],
    footer: { text: 'Earth Revibe · Travel Circle' },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text, applicationNumber }, 'Discord webhook error');
      return false;
    }

    logger.info({ applicationNumber }, 'Discord notification sent');
    return true;
  } catch (err) {
    logger.error({ err, applicationNumber }, 'Discord webhook network error');
    return false;
  }
}

export interface NewOrderDiscordInput {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string; // 'razorpay' | 'COD' | etc.
  status: string; // PLACED | CONFIRMED
  adminOrderUrl?: string;
}

/**
 * Post a rich embed to the orders Discord webhook for every new order.
 * Soft-fail: submission/payment must not be blocked by notification failure.
 */
export async function sendNewOrderToDiscord(input: NewOrderDiscordInput): Promise<boolean> {
  const url = env.DISCORD_ORDER_WEBHOOK_URL;
  if (!url) {
    logger.warn('DISCORD_ORDER_WEBHOOK_URL not set — skipping Discord order notification');
    return false;
  }

  const embed = {
    title: `🛒 New order — ${input.orderNumber}`,
    color: EMBED_COLOR_GREEN,
    timestamp: new Date().toISOString(),
    fields: [
      { name: 'Customer', value: input.customerName || '—', inline: true },
      { name: 'Total', value: `₹${input.totalAmount.toLocaleString('en-IN')}`, inline: true },
      { name: 'Items', value: String(input.itemCount), inline: true },
      { name: 'Payment', value: input.paymentMethod, inline: true },
      { name: 'Status', value: input.status, inline: true },
      ...(input.customerEmail ? [{ name: 'Email', value: input.customerEmail, inline: true }] : []),
      ...(input.customerPhone ? [{ name: 'Phone', value: input.customerPhone, inline: true }] : []),
    ],
    ...(input.adminOrderUrl ? { url: input.adminOrderUrl } : {}),
    footer: { text: 'Earth Revibe · Orders' },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { status: res.status, body: text, orderNumber: input.orderNumber },
        'Discord order webhook error'
      );
      return false;
    }

    logger.info({ orderNumber: input.orderNumber }, 'Discord order notification sent');
    return true;
  } catch (err) {
    logger.error({ err, orderNumber: input.orderNumber }, 'Discord order webhook network error');
    return false;
  }
}

interface ReturnUpdateDiscordInput {
  orderNumber: string;
  status: string;
  note?: string;
}

/**
 * Post a return-lifecycle update to the orders Discord webhook. Soft-fail:
 * notification failure must never roll back a return transition.
 */
export async function sendReturnUpdateToDiscord(input: ReturnUpdateDiscordInput): Promise<boolean> {
  const url = env.DISCORD_ORDER_WEBHOOK_URL;
  if (!url) return false;

  const embed = {
    title: `↩️ Return ${input.status} — ${input.orderNumber}`,
    color: EMBED_COLOR_CLAY,
    timestamp: new Date().toISOString(),
    fields: [
      { name: 'Order', value: input.orderNumber, inline: true },
      { name: 'Return status', value: input.status, inline: true },
      ...(input.note ? [{ name: 'Note', value: input.note, inline: false }] : []),
    ],
    footer: { text: 'Earth Revibe · Returns' },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      logger.error(
        { status: res.status, orderNumber: input.orderNumber },
        'Discord return webhook error'
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err, orderNumber: input.orderNumber }, 'Discord return webhook network error');
    return false;
  }
}
