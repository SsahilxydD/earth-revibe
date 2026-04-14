import { prisma, Prisma } from '@earth-revibe/db';
import type {
  TravelApplicationSubmitInput,
  TravelApplicationListQuery,
  TravelApplicationUpdateInput,
} from '@earth-revibe/shared';
import { logger } from '../config/logger';
import { APP_CONSTANTS } from '../config/constants';
import { ApiError } from '../utils/api-error';
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

  // ── Admin operations ─────────────────────────────────────────────────────

  async list(query: TravelApplicationListQuery) {
    const { page, limit, status, search, sortBy, sortOrder } = query;
    const where: Prisma.TravelApplicationWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { instagram: { contains: search, mode: 'insensitive' } },
        { applicationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.travelApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.travelApplication.count({ where }),
    ]);

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const row = await prisma.travelApplication.findUnique({ where: { id } });
    if (!row) throw ApiError.notFound('Application not found');
    return row;
  },

  async update(id: string, data: TravelApplicationUpdateInput) {
    const existing = await prisma.travelApplication.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Application not found');

    return prisma.travelApplication.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status, reviewedAt: new Date() } : {}),
        ...(data.reviewNotes !== undefined ? { reviewNotes: data.reviewNotes } : {}),
      },
    });
  },

  async exportCSV() {
    const totalCount = await prisma.travelApplication.count();
    const rows = await prisma.travelApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: APP_CONSTANTS.MAX_CSV_EXPORT_ROWS,
    });
    const truncated = totalCount > APP_CONSTANTS.MAX_CSV_EXPORT_ROWS;

    const escape = (val: string) => (/[,"\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val);

    const header = [
      'Application #',
      'Submitted',
      'Status',
      'Name',
      'Age',
      'City',
      'Phone',
      'Instagram',
      'Traveler Type',
      'Trip Preferences',
      'Travelled Before',
      'Met Before',
      'Curated OK',
      'Why Join',
      'Review Notes',
      'Reviewed',
    ].join(',');

    const body = rows.map((r) =>
      [
        escape(r.applicationNumber),
        new Date(r.createdAt).toISOString(),
        r.status,
        escape(r.name),
        String(r.age),
        escape(r.city),
        escape(r.phone),
        escape(r.instagram),
        r.travelerType,
        escape(r.tripPrefs.join('; ')),
        r.pastTravel,
        r.meetBefore,
        r.curated,
        escape(r.whyJoin),
        escape(r.reviewNotes ?? ''),
        r.reviewedAt ? new Date(r.reviewedAt).toISOString() : '',
      ].join(',')
    );

    return {
      csv: [header, ...body].join('\n'),
      truncated,
      totalCount,
      exportedCount: rows.length,
    };
  },
};
