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
import {
  sendWhatsAppTripApplicationAlert,
  sendWhatsAppTripApplicationReceived,
  sendWhatsAppDecision,
} from './whatsapp.service';
import {
  sendSubmissionReceivedEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendWaitlistEmail,
} from './travel-application-email.service';

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
            email: data.email,
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

        // Fan out notifications in parallel. All are soft-fail (never throw),
        // and we fire-and-forget so the applicant's response isn't blocked by
        // slow third-party APIs. Errors are logged inside each function.
        //
        // Team-facing: Discord embed + WhatsApp alert to TRIP_FORM_NOTIFY_PHONE.
        // Applicant-facing: acknowledgement email + WhatsApp, triggered together
        // (both fire — not either/or — so the applicant gets confirmation on
        // whichever channel they check first). After both applicant-facing
        // sends settle, stamp `receivedNotifiedAt` so the admin backfill job
        // can skip this row next time.
        void Promise.allSettled([
          sendTripApplicationToDiscord({
            applicationNumber: created.applicationNumber,
            data,
          }),
          sendWhatsAppTripApplicationAlert(created.applicationNumber, data.name, data.city),
        ]);

        void (async () => {
          const [emailRes, whatsAppRes] = await Promise.allSettled([
            data.email
              ? sendSubmissionReceivedEmail({
                  to: data.email,
                  name: data.name,
                  applicationNumber: created.applicationNumber,
                })
              : Promise.resolve(false),
            sendWhatsAppTripApplicationReceived(data.phone, data.name, created.applicationNumber),
          ]);
          const emailSent = emailRes.status === 'fulfilled' && emailRes.value === true;
          const whatsAppSent = whatsAppRes.status === 'fulfilled' && whatsAppRes.value === true;
          // Stamp receipt if either channel succeeded. If both failed the
          // admin backfill will pick this row up later.
          if (emailSent || whatsAppSent) {
            await prisma.travelApplication
              .update({
                where: { id: created.id },
                data: { receivedNotifiedAt: new Date() },
              })
              .catch((err: unknown) =>
                logger.error(
                  { err, applicationNumber: created.applicationNumber },
                  'failed to stamp receivedNotifiedAt'
                )
              );
          }
        })();

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

  /**
   * One-click backfill: send the submission-receipt email + WhatsApp to every
   * applicant who has not yet received one (receivedNotifiedAt IS NULL).
   *
   * We scope to `status = PENDING` by default — decided applicants have
   * already had an approval/rejection/waitlist message, so sending a "we got
   * your application" on top would read oddly. Admins can override via the
   * `includeDecided` flag if they specifically want to touch everyone.
   *
   * Runs inline (no queue) with a small delay between sends to stay polite
   * to Meta's rate limits. Soft-fail per row — one failure doesn't abort
   * the batch. Idempotency-safe: re-running only picks up rows that haven't
   * been stamped yet.
   */
  async backfillReceiptNotifications(opts: { includeDecided?: boolean } = {}) {
    const where: Prisma.TravelApplicationWhereInput = {
      receivedNotifiedAt: null,
    };
    if (!opts.includeDecided) where.status = 'PENDING';

    const rows = await prisma.travelApplication.findMany({
      where,
      select: {
        id: true,
        applicationNumber: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let emailSent = 0;
    let whatsAppSent = 0;
    let stamped = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const [emailRes, whatsAppRes] = await Promise.allSettled([
          row.email
            ? sendSubmissionReceivedEmail({
                to: row.email,
                name: row.name,
                applicationNumber: row.applicationNumber,
              })
            : Promise.resolve(false),
          sendWhatsAppTripApplicationReceived(row.phone, row.name, row.applicationNumber),
        ]);

        const okEmail = emailRes.status === 'fulfilled' && emailRes.value === true;
        const okWhatsApp = whatsAppRes.status === 'fulfilled' && whatsAppRes.value === true;
        if (okEmail) emailSent++;
        if (okWhatsApp) whatsAppSent++;

        if (okEmail || okWhatsApp) {
          await prisma.travelApplication.update({
            where: { id: row.id },
            data: { receivedNotifiedAt: new Date() },
          });
          stamped++;
        } else {
          failed++;
          logger.warn(
            { applicationNumber: row.applicationNumber },
            'backfill: both email and WhatsApp failed for row'
          );
        }
      } catch (err) {
        failed++;
        logger.error(
          { err, applicationNumber: row.applicationNumber },
          'backfill: row processing threw'
        );
      }

      // Pace outbound to respect Meta template rate limits. 200ms per row =
      // up to 5 rps, well below the default cap.
      await new Promise((r) => setTimeout(r, 200));
    }

    logger.info(
      { total: rows.length, emailSent, whatsAppSent, stamped, failed },
      'travel application receipt backfill complete'
    );

    return {
      total: rows.length,
      emailSent,
      whatsAppSent,
      stamped,
      failed,
    };
  },

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

    const updated = await prisma.travelApplication.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status, reviewedAt: new Date() } : {}),
        ...(data.reviewNotes !== undefined ? { reviewNotes: data.reviewNotes } : {}),
      },
    });

    // Fire applicant-facing notifications on a decision status change.
    // Dedupe: skip if we've already notified for this same status (prevents
    // duplicate emails/WhatsApps if admin re-clicks the same decision).
    const DECISION_STATUSES = ['APPROVED', 'REJECTED', 'WAITLISTED'] as const;
    type DecisionStatus = (typeof DECISION_STATUSES)[number];
    const isDecision = (s: string | null): s is DecisionStatus =>
      s !== null && (DECISION_STATUSES as readonly string[]).includes(s);

    if (data.status && isDecision(updated.status) && updated.notifiedStatus !== updated.status) {
      const kind =
        updated.status === 'APPROVED'
          ? 'approved'
          : updated.status === 'REJECTED'
            ? 'rejected'
            : 'waitlisted';

      const emailSender =
        kind === 'approved'
          ? sendApprovalEmail
          : kind === 'rejected'
            ? sendRejectionEmail
            : sendWaitlistEmail;

      // Fan out email + WhatsApp in parallel, soft-fail. Mark as notified
      // after both settle (regardless of success) so the admin can manually
      // retry by clicking a different status and back if a transient
      // delivery failure occurs.
      const emailPromise = updated.email
        ? emailSender({
            to: updated.email,
            name: updated.name,
            applicationNumber: updated.applicationNumber,
          })
        : Promise.resolve(false);

      const whatsAppPromise = sendWhatsAppDecision(
        kind,
        updated.phone,
        updated.name,
        updated.applicationNumber
      );

      void Promise.allSettled([emailPromise, whatsAppPromise]).then(async () => {
        await prisma.travelApplication.update({
          where: { id: updated.id },
          data: { notifiedAt: new Date(), notifiedStatus: updated.status },
        });
      });
    }

    return updated;
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
      'Email',
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
        escape(r.email ?? ''),
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
