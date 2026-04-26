import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { logger } from '../config/logger';
import { adminDeviceService } from './admin-device.service';

let _expo: Expo | null = null;
function getExpo(): Expo {
  if (!_expo) _expo = new Expo();
  return _expo;
}

export interface AdminPushPayload {
  title: string;
  body: string;
  /** Type-tagged data for the mobile app's notification handler. */
  data: { type: 'NEW_ORDER'; orderNumber: string };
}

/**
 * Push to every registered admin device in parallel. Drops tokens that
 * Expo's push service rejects with `DeviceNotRegistered` so we don't keep
 * trying them. Soft-fails on every error path — never throws.
 */
export async function pushToAllAdmins(payload: AdminPushPayload): Promise<void> {
  let tokens: Array<{ userId: string; expoPushToken: string }> = [];
  try {
    tokens = await adminDeviceService.listAdminTokens();
  } catch (err) {
    logger.error({ err }, 'expo-push: failed to load admin tokens, skipping push fan-out');
    return;
  }

  if (tokens.length === 0) {
    logger.info('expo-push: no registered admin devices, skipping');
    return;
  }

  const expo = getExpo();
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t.expoPushToken));
  const invalidTokens = tokens
    .filter((t) => !Expo.isExpoPushToken(t.expoPushToken))
    .map((t) => t.expoPushToken);

  if (invalidTokens.length > 0) {
    // Drop garbage tokens (e.g. someone POSTed a malformed token)
    await adminDeviceService.dropTokens(invalidTokens);
  }

  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((t) => ({
    to: t.expoPushToken,
    title: payload.title,
    body: payload.body,
    sound: 'default',
    priority: 'high',
    channelId: 'orders',
    data: payload.data,
  }));

  // Expo recommends batching at 100 messages per chunk.
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    } catch (err) {
      logger.error({ err }, 'expo-push: chunk send failed');
    }
  }

  // Identify tokens whose tickets reported DeviceNotRegistered and drop them.
  const tokensToDrop: string[] = [];
  tickets.forEach((ticket, i) => {
    if (
      ticket.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered' &&
      messages[i]
    ) {
      tokensToDrop.push(messages[i].to as string);
    }
  });
  if (tokensToDrop.length > 0) {
    await adminDeviceService.dropTokens(tokensToDrop);
    logger.info({ count: tokensToDrop.length }, 'expo-push: dropped DeviceNotRegistered tokens');
  }
}
