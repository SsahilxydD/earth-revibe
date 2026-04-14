import { env } from '../config/env';
import { logger } from '../config/logger';
import type { TravelApplicationSubmitInput } from '@earth-revibe/shared';

// Clay tone from the trip-form design system — matches the brand.
const EMBED_COLOR_CLAY = 0xb85c38;

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
