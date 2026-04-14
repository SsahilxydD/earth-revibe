import { prisma } from '@earth-revibe/db';
import type { TravelApplicationSubmitInput } from '@earth-revibe/shared';
import { logger } from '../config/logger';
import { sendTripApplicationToDiscord } from './discord.service';
import { sendWhatsAppTripApplicationAlert } from './whatsapp.service';

/**
 * Generate a human-friendly application number like "ER-2026-0042".
 * We use the DB row count for the current year + 1 as the sequence — this is
 * not concurrency-safe under high concurrency, but travel-circle applications
 * come in at a pace where a race is functionally irrelevant; the `@unique`
 * constraint on applicationNumber will reject collisions and the caller retries.
 */
async function nextApplicationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const count = await prisma.travelApplication.count({
    where: { createdAt: { gte: startOfYear } },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `ER-${year}-${seq}`;
}

export const travelApplicationService = {
  async submit(params: { userId: string | null; data: TravelApplicationSubmitInput }) {
    const { userId, data } = params;

    // Small retry loop in case of applicationNumber collision under concurrency.
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const applicationNumber = await nextApplicationNumber();
      try {
        const created = await prisma.travelApplication.create({
          data: {
            applicationNumber,
            userId,
            phone: data.phone,
            name: data.name,
            age: Number(data.age),
            city: data.city,
            instagram: data.instagram,
            travelerType: data.travelerType,
            whyJoin: data.whyJoin,
            pastTravel: data.pastTravel,
            tripPrefs: data.tripPrefs,
            meetBefore: data.meetBefore,
            curated: data.curated,
          },
          select: { id: true, applicationNumber: true },
        });
        logger.info(
          { id: created.id, applicationNumber: created.applicationNumber, userId },
          'travel application submitted'
        );

        // Fan out notifications in parallel. Both are soft-fail (never throw),
        // and we fire-and-forget so the applicant's response isn't blocked by
        // slow third-party APIs. Errors are logged inside each function.
        void Promise.allSettled([
          sendTripApplicationToDiscord({
            applicationNumber: created.applicationNumber,
            data,
          }),
          sendWhatsAppTripApplicationAlert(created.applicationNumber, data.name, data.city),
        ]);

        return created;
      } catch (err) {
        // Prisma P2002 = unique constraint violation. Retry with a fresh number.
        const code = (err as { code?: string }).code;
        if (code === 'P2002') {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr ?? new Error('Failed to assign application number');
  },
};
