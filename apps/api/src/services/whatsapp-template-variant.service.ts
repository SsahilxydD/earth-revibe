import { prisma } from '@earth-revibe/db';
import type {
  TemplateKey,
  TemplateVariantInput,
  TemplateVariantRow,
  VariantCounts,
} from '@earth-revibe/shared';
import { ApiError } from '../utils/api-error';
import { logger } from '../config/logger';

// CRM A/B variant picker + CRUD. Send helpers call pickVariant() to choose
// which Meta-approved templateName to use; the CRM /templates dashboard reads
// list() with counts to compare per-variant funnel performance.

const ZERO_COUNTS: VariantCounts = {
  queued: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
};

/// In-memory micro-cache for the picker. Variant configs change rarely; even
/// a 30s cache cuts ~95% of the per-send DB hit on the abandoned-cart sweep.
const PICK_CACHE_TTL_MS = 30_000;
const pickCache = new Map<
  string,
  { fetchedAt: number; rows: { variantKey: string; templateName: string; weight: number }[] }
>();

interface PickResult {
  templateKey: TemplateKey;
  variantKey: string;
  templateName: string;
}

/**
 * Pick a variant for the given templateKey by weighted random selection
 * across active rows. Returns null if no active variants exist — the caller
 * should fall back to a hardcoded default templateName so the absence of
 * variant rows doesn't break sending.
 */
export async function pickVariant(templateKey: TemplateKey): Promise<PickResult | null> {
  const cached = pickCache.get(templateKey);
  let rows: { variantKey: string; templateName: string; weight: number }[];
  if (cached && Date.now() - cached.fetchedAt < PICK_CACHE_TTL_MS) {
    rows = cached.rows;
  } else {
    const dbRows = await prisma.whatsAppTemplateVariant.findMany({
      where: { templateKey, isActive: true, weight: { gt: 0 } },
      select: { variantKey: true, templateName: true, weight: true },
    });
    rows = dbRows;
    pickCache.set(templateKey, { fetchedAt: Date.now(), rows });
  }

  if (rows.length === 0) return null;

  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight <= 0) return null;
  let target = Math.random() * totalWeight;
  for (const row of rows) {
    target -= row.weight;
    if (target <= 0) {
      return { templateKey, variantKey: row.variantKey, templateName: row.templateName };
    }
  }
  // Floating-point edge case — fall through to last row.
  const last = rows[rows.length - 1];
  return { templateKey, variantKey: last.variantKey, templateName: last.templateName };
}

/**
 * Invalidate the picker cache. Called by CRUD mutations so newly-saved
 * variants take effect on the next send within ≤30s anyway.
 */
function invalidatePickCache(templateKey: TemplateKey) {
  pickCache.delete(templateKey);
}

/**
 * Write the send-time "queued" event so subsequent webhook events for the
 * same messageId can be grouped against this variant. Best-effort — a write
 * failure here is logged but not raised, because the message already left
 * for Meta and we don't want to abort the user-visible flow.
 */
export async function recordVariantSend(args: {
  messageId: string;
  waId: string | undefined;
  templateKey: TemplateKey;
  variantKey: string;
}): Promise<void> {
  try {
    await prisma.whatsAppMessageEvent.create({
      data: {
        messageId: args.messageId,
        waId: args.waId,
        status: 'queued',
        templateKey: args.templateKey,
        variantKey: args.variantKey,
        rawPayload: { source: 'send-helper', queuedAt: new Date().toISOString() },
        eventAt: new Date(),
      },
    });
  } catch (err) {
    logger.warn(
      {
        err,
        messageId: args.messageId,
        templateKey: args.templateKey,
        variantKey: args.variantKey,
      },
      'Failed to record variant send (analytics will miss this message)'
    );
  }
}

export const whatsAppTemplateVariantService = {
  async list(): Promise<TemplateVariantRow[]> {
    const variants = await prisma.whatsAppTemplateVariant.findMany({
      orderBy: [{ templateKey: 'asc' }, { variantKey: 'asc' }],
    });

    if (variants.length === 0) return [];

    // Aggregate event counts per (templateKey, variantKey, status). One
    // groupBy is way cheaper than per-variant queries even with the new
    // composite index.
    const counts = await prisma.whatsAppMessageEvent.groupBy({
      by: ['templateKey', 'variantKey', 'status'],
      where: { templateKey: { not: null }, variantKey: { not: null } },
      _count: { _all: true },
    });

    const countMap = new Map<string, VariantCounts>();
    for (const c of counts) {
      if (!c.templateKey || !c.variantKey) continue;
      const key = `${c.templateKey}::${c.variantKey}`;
      const existing = countMap.get(key) ?? { ...ZERO_COUNTS };
      // Status comes from Meta; clamp anything unexpected to zero counts.
      if (c.status === 'queued') existing.queued = c._count._all;
      else if (c.status === 'sent') existing.sent = c._count._all;
      else if (c.status === 'delivered') existing.delivered = c._count._all;
      else if (c.status === 'read') existing.read = c._count._all;
      else if (c.status === 'failed') existing.failed = c._count._all;
      countMap.set(key, existing);
    }

    return variants.map((v) => ({
      id: v.id,
      templateKey: v.templateKey as TemplateKey,
      variantKey: v.variantKey,
      templateName: v.templateName,
      bodyPreview: v.bodyPreview,
      weight: v.weight,
      isActive: v.isActive,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      counts: countMap.get(`${v.templateKey}::${v.variantKey}`) ?? { ...ZERO_COUNTS },
    }));
  },

  async create(input: TemplateVariantInput): Promise<TemplateVariantRow> {
    const exists = await prisma.whatsAppTemplateVariant.findUnique({
      where: {
        templateKey_variantKey: {
          templateKey: input.templateKey,
          variantKey: input.variantKey,
        },
      },
    });
    if (exists)
      throw ApiError.conflict(`Variant ${input.templateKey}/${input.variantKey} already exists`);

    const v = await prisma.whatsAppTemplateVariant.create({
      data: {
        templateKey: input.templateKey,
        variantKey: input.variantKey,
        templateName: input.templateName,
        bodyPreview: input.bodyPreview ?? null,
        weight: input.weight,
        isActive: input.isActive,
      },
    });
    invalidatePickCache(input.templateKey);
    return rowToShape(v);
  },

  async update(id: string, input: TemplateVariantInput): Promise<TemplateVariantRow> {
    const existing = await prisma.whatsAppTemplateVariant.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Variant not found');

    // Allow renaming the (templateKey, variantKey) pair, but enforce
    // uniqueness against any OTHER row.
    if (existing.templateKey !== input.templateKey || existing.variantKey !== input.variantKey) {
      const collision = await prisma.whatsAppTemplateVariant.findUnique({
        where: {
          templateKey_variantKey: {
            templateKey: input.templateKey,
            variantKey: input.variantKey,
          },
        },
      });
      if (collision && collision.id !== id) {
        throw ApiError.conflict(`Variant ${input.templateKey}/${input.variantKey} already exists`);
      }
    }

    const v = await prisma.whatsAppTemplateVariant.update({
      where: { id },
      data: {
        templateKey: input.templateKey,
        variantKey: input.variantKey,
        templateName: input.templateName,
        bodyPreview: input.bodyPreview ?? null,
        weight: input.weight,
        isActive: input.isActive,
      },
    });
    invalidatePickCache(existing.templateKey as TemplateKey);
    if (existing.templateKey !== input.templateKey) {
      invalidatePickCache(input.templateKey);
    }
    return rowToShape(v);
  },

  async delete(id: string): Promise<void> {
    const existing = await prisma.whatsAppTemplateVariant.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Variant not found');
    await prisma.whatsAppTemplateVariant.delete({ where: { id } });
    invalidatePickCache(existing.templateKey as TemplateKey);
  },
};

function rowToShape(v: {
  id: string;
  templateKey: string;
  variantKey: string;
  templateName: string;
  bodyPreview: string | null;
  weight: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TemplateVariantRow {
  return {
    id: v.id,
    templateKey: v.templateKey as TemplateKey,
    variantKey: v.variantKey,
    templateName: v.templateName,
    bodyPreview: v.bodyPreview,
    weight: v.weight,
    isActive: v.isActive,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}
