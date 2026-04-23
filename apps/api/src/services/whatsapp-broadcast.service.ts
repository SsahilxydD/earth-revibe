import { prisma } from '@earth-revibe/db';
import type {
  WhatsAppBroadcastInput,
  WhatsAppBroadcastSource,
  WhatsAppTripOpeningBroadcastInput,
} from '@earth-revibe/shared';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';
import { sendWhatsAppTripAnnouncement, sendWhatsAppTripOpening } from './whatsapp.service';

// ── Rate limit: matches Meta's per-phone-number messaging tier ─────────
// Default 2000/24h = Meta Tier 2. As the WABA gets upgraded (10K, 100K,
// unlimited) set BROADCAST_LIMIT_MAX in Railway. Window defaults to the 24h
// rolling period Meta itself uses for the tier cap; override via env if
// desired. In-memory sliding window — resets on redeploy.
const RATE_LIMIT_MAX = Number(process.env.BROADCAST_LIMIT_MAX) || 2000;
const RATE_LIMIT_WINDOW_MS =
  (Number(process.env.BROADCAST_LIMIT_WINDOW_HOURS) || 24) * 60 * 60 * 1000;
const sendTimestamps: number[] = [];

function pruneExpired() {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  while (sendTimestamps.length > 0 && sendTimestamps[0]! < cutoff) {
    sendTimestamps.shift();
  }
}

export function getBroadcastQuota() {
  pruneExpired();
  const used = sendTimestamps.length;
  const resetAt = used > 0 ? sendTimestamps[0]! + RATE_LIMIT_WINDOW_MS : null;
  return {
    used,
    remaining: Math.max(0, RATE_LIMIT_MAX - used),
    limit: RATE_LIMIT_MAX,
    windowMinutes: RATE_LIMIT_WINDOW_MS / 60000,
    resetAt: resetAt ? new Date(resetAt).toISOString() : null,
  };
}

function recordSends(count: number) {
  const now = Date.now();
  for (let i = 0; i < count; i++) sendTimestamps.push(now);
}

type Contact = {
  phone: string;
  firstName?: string | null;
  name?: string | null;
  email?: string | null;
  city?: string | null;
};

export type BroadcastResult = {
  totalResolved: number;
  totalSent: number;
  totalFailed: number;
  failures: { phone: string; error: string }[];
  dryRun: boolean;
  sampleRecipients?: string[];
};

async function resolveContacts(source: WhatsAppBroadcastSource): Promise<Contact[]> {
  if (source.type === 'recipients') {
    return source.recipients.map((r) => ({
      phone: r.phone,
      firstName: r.firstName ?? null,
      name: r.name ?? null,
      city: r.city ?? null,
    }));
  }

  if (source.type === 'customers') {
    const rows = await prisma.user.findMany({
      where: {
        isActive: true,
        phoneVerified: true,
        phone: { not: null },
        ...(source.hasPlacedOrder ? { orders: { some: {} } } : {}),
      },
      select: { phone: true, firstName: true, lastName: true, email: true },
    });
    return rows
      .filter((r): r is typeof r & { phone: string } => !!r.phone)
      .map((r) => ({
        phone: r.phone,
        firstName: r.firstName,
        name: [r.firstName, r.lastName].filter(Boolean).join(' '),
        email: r.email,
      }));
  }

  // travel-applications — dedupe by phone (applicants can reapply)
  const rows = await prisma.travelApplication.findMany({
    where: {
      status: { in: source.statuses },
      ...(source.city ? { city: { equals: source.city, mode: 'insensitive' } } : {}),
    },
    select: { phone: true, name: true, email: true, city: true },
    orderBy: { createdAt: 'desc' },
  });
  const seen = new Set<string>();
  const out: Contact[] = [];
  for (const r of rows) {
    if (seen.has(r.phone)) continue;
    seen.add(r.phone);
    const first = (r.name || '').trim().split(/\s+/)[0] || null;
    out.push({
      phone: r.phone,
      firstName: first,
      name: r.name,
      email: r.email,
      city: r.city,
    });
  }
  return out;
}

// Simple placeholder substitution — each param string can reference per-contact
// fields via {{firstName}}, {{name}}, {{email}}. Unknown placeholders pass
// through unchanged so they're visible in Meta's error response for debugging.
function interpolate(param: string, contact: Contact): string {
  return param
    .replace(/\{\{firstName\}\}/gi, contact.firstName || 'there')
    .replace(/\{\{name\}\}/gi, contact.name || contact.firstName || 'there')
    .replace(/\{\{email\}\}/gi, contact.email || '')
    .replace(/\{\{city\}\}/gi, contact.city || '');
}

function maskPhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  if (digits.length < 6) return '****';
  return digits.slice(0, 4) + '****' + digits.slice(-2);
}

async function runLimited<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export const whatsAppBroadcastService = {
  getQuota: getBroadcastQuota,

  async broadcastTrip(input: WhatsAppBroadcastInput): Promise<BroadcastResult> {
    const contacts = await resolveContacts(input.source);

    if (input.dryRun) {
      return {
        totalResolved: contacts.length,
        totalSent: 0,
        totalFailed: 0,
        failures: [],
        dryRun: true,
        sampleRecipients: contacts.slice(0, 5).map((c) => maskPhone(c.phone)),
      };
    }

    // Rate-limit check — refuse the whole batch if it would push us over
    // the window, rather than partially sending. Admin can retry after reset.
    const quota = getBroadcastQuota();
    if (contacts.length > quota.remaining) {
      throw ApiError.tooManyRequests(
        `Broadcast of ${contacts.length} would exceed ${quota.windowMinutes / 60}h limit (${quota.remaining} remaining, resets ${quota.resetAt ?? 'now'}).`
      );
    }

    logger.info(
      { count: contacts.length, template: input.templateName, sourceType: input.source.type },
      'WhatsApp trip broadcast starting'
    );

    const failures: { phone: string; error: string }[] = [];
    let sent = 0;

    await runLimited(contacts, input.concurrency, async (contact) => {
      const bodyParams = input.params.map((p) => interpolate(p, contact));
      const buttonUrlParam = input.buttonUrlParam
        ? interpolate(input.buttonUrlParam, contact)
        : undefined;

      const result = await sendWhatsAppTripAnnouncement({
        phone: contact.phone,
        bodyParams,
        buttonUrlParam,
        templateName: input.templateName,
      });

      if (result.ok) {
        sent++;
      } else {
        failures.push({ phone: maskPhone(contact.phone), error: result.error || 'unknown' });
      }
    });

    // Only count successful sends against the quota — Meta charges per
    // accepted message, so failures don't burn budget.
    recordSends(sent);

    logger.info(
      { resolved: contacts.length, sent, failed: failures.length },
      'WhatsApp trip broadcast complete'
    );

    return {
      totalResolved: contacts.length,
      totalSent: sent,
      totalFailed: failures.length,
      failures: failures.slice(0, 50),
      dryRun: false,
    };
  },

  async broadcastTripOpening(input: WhatsAppTripOpeningBroadcastInput): Promise<BroadcastResult> {
    const rows = await prisma.travelApplication.findMany({
      where: {
        status: { in: input.statuses },
        city: { equals: input.city, mode: 'insensitive' },
      },
      select: { phone: true, name: true, applicationNumber: true, city: true },
      orderBy: { createdAt: 'desc' },
    });

    // Dedupe by phone — applicants can re-apply; always use the most recent
    // applicationNumber (rows are createdAt desc above).
    const seen = new Set<string>();
    const recipients: {
      phone: string;
      firstName: string;
      applicationNumber: string;
    }[] = [];
    for (const r of rows) {
      if (seen.has(r.phone)) continue;
      seen.add(r.phone);
      const first = (r.name || '').trim().split(/\s+/)[0] || 'there';
      recipients.push({
        phone: r.phone,
        firstName: first,
        applicationNumber: r.applicationNumber,
      });
    }

    if (input.dryRun) {
      return {
        totalResolved: recipients.length,
        totalSent: 0,
        totalFailed: 0,
        failures: [],
        dryRun: true,
        sampleRecipients: recipients.slice(0, 5).map((r) => maskPhone(r.phone)),
      };
    }

    const quota = getBroadcastQuota();
    if (recipients.length > quota.remaining) {
      throw ApiError.tooManyRequests(
        `Broadcast of ${recipients.length} would exceed ${quota.windowMinutes / 60}h limit (${quota.remaining} remaining, resets ${quota.resetAt ?? 'now'}).`
      );
    }

    logger.info(
      { count: recipients.length, city: input.city, tripLabel: input.tripLabel },
      'WhatsApp trip-opening broadcast starting'
    );

    const failures: { phone: string; error: string }[] = [];
    let sent = 0;

    await runLimited(recipients, input.concurrency, async (r) => {
      const result = await sendWhatsAppTripOpening({
        phone: r.phone,
        firstName: r.firstName,
        applicationNumber: r.applicationNumber,
        tripLabel: input.tripLabel,
        templateName: input.templateName,
      });
      if (result.ok) sent++;
      else failures.push({ phone: maskPhone(r.phone), error: result.error || 'unknown' });
    });

    recordSends(sent);

    logger.info(
      { resolved: recipients.length, sent, failed: failures.length, city: input.city },
      'WhatsApp trip-opening broadcast complete'
    );

    return {
      totalResolved: recipients.length,
      totalSent: sent,
      totalFailed: failures.length,
      failures: failures.slice(0, 50),
      dryRun: false,
    };
  },
};
