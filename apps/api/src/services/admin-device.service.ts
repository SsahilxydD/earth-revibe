import { prisma } from '@earth-revibe/db';
import type { RegisterDeviceInput } from '@earth-revibe/shared';

export const adminDeviceService = {
  /**
   * Upsert by expoPushToken — Expo guarantees the token is unique per device,
   * so re-installing the app gives a new token, but a single device should
   * never produce two rows. If the token is reassigned to a different user,
   * the row is rebound (user logged in on someone else's device — rare but
   * supported for shared admin tablets).
   */
  async register(userId: string, input: RegisterDeviceInput) {
    return prisma.adminDevice.upsert({
      where: { expoPushToken: input.expoPushToken },
      create: {
        userId,
        expoPushToken: input.expoPushToken,
        platform: input.platform,
        appVersion: input.appVersion,
      },
      update: {
        userId,
        platform: input.platform,
        appVersion: input.appVersion,
        lastSeenAt: new Date(),
      },
    });
  },

  async unregister(userId: string, expoPushToken: string) {
    // Scope to userId so a user can't delete someone else's device row.
    await prisma.adminDevice.deleteMany({
      where: { userId, expoPushToken },
    });
  },

  /**
   * Used by the alert fan-out (Phase 3) to enumerate devices for ADMIN +
   * SUPER_ADMIN users. Returned with userId so we can attribute opens later.
   */
  async listAdminTokens(): Promise<Array<{ userId: string; expoPushToken: string }>> {
    const rows = await prisma.adminDevice.findMany({
      where: {
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
          isActive: true,
        },
      },
      select: { userId: true, expoPushToken: true },
    });
    return rows;
  },

  /**
   * Drop tokens that Expo's push service rejected as `DeviceNotRegistered`.
   * Called by the push service when it batches receipts.
   */
  async dropTokens(expoPushTokens: string[]) {
    if (expoPushTokens.length === 0) return;
    await prisma.adminDevice.deleteMany({
      where: { expoPushToken: { in: expoPushTokens } },
    });
  },
};
