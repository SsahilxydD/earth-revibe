import { prisma, type Prisma } from '@earth-revibe/db';
import type {
  CustomerSegmentInput,
  CustomerSegmentRow,
  SegmentDefinition,
  SegmentFilter,
} from '@earth-revibe/shared';
import { ApiError } from '../utils/api-error';
import { logger } from '../config/logger';

// Customer-segment evaluator. Translates the flat (field, op, value) DSL
// into Prisma where-clauses, counts the matching CUSTOMER users, and
// stores the result on the segment row.

function rowToShape(row: {
  id: string;
  name: string;
  definition: Prisma.JsonValue;
  memberCount: number;
  lastEvaluatedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CustomerSegmentRow {
  return {
    id: row.id,
    name: row.name,
    definition: row.definition as unknown as SegmentDefinition,
    memberCount: row.memberCount,
    lastEvaluatedAt: row.lastEvaluatedAt?.toISOString() ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Translate one filter into Prisma where-clause additions. Returns either:
 * - { user: { … } } / { … } scalar conditions to merge into the where clause
 * - or a thunk that runs orderCount-style aggregations and returns matching userIds
 *
 * Some fields require a separate aggregation pass (sum of orders, days since
 * last order, total order count). For v1 we evaluate by:
 *   1. Building scalar User conditions for fields that map directly to columns.
 *   2. For aggregate fields, computing the matching userIds via a groupBy and
 *      adding `{ id: { in: ids } }` to the where clause.
 */
async function evaluateDefinition(definition: SegmentDefinition): Promise<number> {
  const where: Prisma.UserWhereInput = { role: 'CUSTOMER', isActive: true };
  const aggregateConstraints: Array<Prisma.UserWhereInput> = [];

  for (const f of definition.filters) {
    const additional = await translateFilter(f);
    if (additional) aggregateConstraints.push(additional);
  }

  // AND the aggregate constraints into the main where clause.
  if (aggregateConstraints.length > 0) {
    where.AND = aggregateConstraints;
  }

  return prisma.user.count({ where });
}

async function translateFilter(f: SegmentFilter): Promise<Prisma.UserWhereInput | null> {
  switch (f.field) {
    case 'loyaltyPoints': {
      if (typeof f.value !== 'number') return null;
      return { loyaltyPoints: numericOp(f.op, f.value) };
    }
    case 'accountAgeDays': {
      if (typeof f.value !== 'number') return null;
      // accountAgeDays >= N → user.createdAt <= now - N days
      // The op semantics on a "days ago" field invert the date comparison.
      const cutoff = new Date(Date.now() - f.value * 24 * 60 * 60 * 1000);
      return { createdAt: invertedDateOp(f.op, cutoff) };
    }
    case 'hasPhone': {
      if (typeof f.value !== 'boolean') return null;
      return f.value ? { phone: { not: null } } : { phone: null };
    }
    case 'hasOrders': {
      if (typeof f.value !== 'boolean') return null;
      // Use orders relation existence — Prisma's `some` for any/none semantics.
      return f.value ? { orders: { some: {} } } : { orders: { none: {} } };
    }
    case 'orderCount': {
      if (typeof f.value !== 'number') return null;
      const grouped = await prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { not: null } },
        _count: { _all: true },
      });
      const matchingIds = grouped
        .filter((g) => g.userId !== null && compareNumber(f.op, g._count._all, f.value as number))
        .map((g) => g.userId as string);
      // For "orderCount eq 0" / "lte 0", users with NO orders should match.
      // groupBy doesn't return them. Add them to the candidate set when relevant.
      if ((f.op === 'eq' && f.value === 0) || (f.op === 'lte' && f.value >= 0)) {
        const noOrderUsers = await prisma.user.findMany({
          where: { role: 'CUSTOMER', orders: { none: {} } },
          select: { id: true },
        });
        for (const u of noOrderUsers) matchingIds.push(u.id);
      }
      return { id: { in: matchingIds } };
    }
    case 'totalSpent': {
      if (typeof f.value !== 'number') return null;
      const grouped = await prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { not: null } },
        _sum: { totalAmount: true },
      });
      const matchingIds = grouped
        .filter((g) => {
          if (g.userId === null) return false;
          const sum = Number(g._sum.totalAmount ?? 0);
          return compareNumber(f.op, sum, f.value as number);
        })
        .map((g) => g.userId as string);
      if ((f.op === 'eq' && f.value === 0) || (f.op === 'lte' && f.value >= 0)) {
        const noOrderUsers = await prisma.user.findMany({
          where: { role: 'CUSTOMER', orders: { none: {} } },
          select: { id: true },
        });
        for (const u of noOrderUsers) matchingIds.push(u.id);
      }
      return { id: { in: matchingIds } };
    }
    case 'lastOrderDaysAgo': {
      if (typeof f.value !== 'number') return null;
      // lastOrderDaysAgo gte N → most-recent order is older than (now - N days).
      const cutoff = new Date(Date.now() - f.value * 24 * 60 * 60 * 1000);
      const grouped = await prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { not: null } },
        _max: { createdAt: true },
      });
      const matchingIds = grouped
        .filter((g) => {
          if (g.userId === null || !g._max.createdAt) return false;
          const lastOrder = g._max.createdAt;
          // Days-ago semantics flip the comparison.
          if (f.op === 'gte') return lastOrder <= cutoff;
          if (f.op === 'lte') return lastOrder >= cutoff;
          if (f.op === 'eq') {
            const dayMs = 24 * 60 * 60 * 1000;
            return Math.abs(lastOrder.getTime() - cutoff.getTime()) < dayMs;
          }
          return false;
        })
        .map((g) => g.userId as string);
      return { id: { in: matchingIds } };
    }
    default:
      return null;
  }
}

function numericOp(op: 'eq' | 'gte' | 'lte', value: number): Prisma.IntFilter {
  if (op === 'eq') return { equals: value };
  if (op === 'gte') return { gte: value };
  return { lte: value };
}

function invertedDateOp(op: 'eq' | 'gte' | 'lte', cutoff: Date): Prisma.DateTimeFilter {
  // accountAgeDays gte N means user.createdAt <= now - N days.
  if (op === 'gte') return { lte: cutoff };
  if (op === 'lte') return { gte: cutoff };
  // eq is approximate to within a day window.
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    gte: new Date(cutoff.getTime() - dayMs / 2),
    lte: new Date(cutoff.getTime() + dayMs / 2),
  };
}

function compareNumber(op: 'eq' | 'gte' | 'lte', a: number, b: number): boolean {
  if (op === 'eq') return a === b;
  if (op === 'gte') return a >= b;
  return a <= b;
}

export const customerSegmentService = {
  async list(): Promise<CustomerSegmentRow[]> {
    const rows = await prisma.customerSegment.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(rowToShape);
  },

  async create(input: CustomerSegmentInput): Promise<CustomerSegmentRow> {
    const memberCount = await evaluateDefinition(input.definition);
    const row = await prisma.customerSegment.create({
      data: {
        name: input.name,
        definition: input.definition as unknown as Prisma.InputJsonValue,
        isActive: input.isActive,
        memberCount,
        lastEvaluatedAt: new Date(),
      },
    });
    return rowToShape(row);
  },

  async update(id: string, input: CustomerSegmentInput): Promise<CustomerSegmentRow> {
    const existing = await prisma.customerSegment.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Segment not found');
    const memberCount = await evaluateDefinition(input.definition);
    const row = await prisma.customerSegment.update({
      where: { id },
      data: {
        name: input.name,
        definition: input.definition as unknown as Prisma.InputJsonValue,
        isActive: input.isActive,
        memberCount,
        lastEvaluatedAt: new Date(),
      },
    });
    return rowToShape(row);
  },

  async delete(id: string): Promise<void> {
    const existing = await prisma.customerSegment.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Segment not found');
    await prisma.customerSegment.delete({ where: { id } });
  },

  async refresh(id: string): Promise<CustomerSegmentRow> {
    const existing = await prisma.customerSegment.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Segment not found');
    const definition = existing.definition as unknown as SegmentDefinition;
    const memberCount = await evaluateDefinition(definition);
    const row = await prisma.customerSegment.update({
      where: { id },
      data: { memberCount, lastEvaluatedAt: new Date() },
    });
    return rowToShape(row);
  },

  /**
   * Cron entry: refresh every active segment. Errors on individual segments
   * are logged but don't abort the batch.
   */
  async runCron(): Promise<{ refreshed: number; errors: number }> {
    const segments = await prisma.customerSegment.findMany({
      where: { isActive: true },
      select: { id: true, definition: true },
    });
    let refreshed = 0;
    let errors = 0;
    for (const s of segments) {
      try {
        const memberCount = await evaluateDefinition(s.definition as unknown as SegmentDefinition);
        await prisma.customerSegment.update({
          where: { id: s.id },
          data: { memberCount, lastEvaluatedAt: new Date() },
        });
        refreshed++;
      } catch (err) {
        logger.error({ err, segmentId: s.id }, 'Failed to refresh segment');
        errors++;
      }
    }
    return { refreshed, errors };
  },
};
