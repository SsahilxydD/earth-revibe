import { Prisma } from '@earth-revibe/db';

/**
 * Soft-delete (archive) filtering helpers for the Order model.
 *
 * An archived order has `deletedAt` set. Archived orders must be hidden from:
 *  - the admin order list (unless explicitly viewing the archive)
 *  - customer order history
 *  - ALL analytics aggregates (revenue, counts, top products, etc.)
 *
 * They are never hard-deleted and remain restorable. Use these helpers
 * everywhere an order list / aggregate is computed so the rule stays
 * consistent and a future query can't silently leak archived orders.
 */

/** Prisma `where` fragment: only non-archived orders. */
export const notArchived: Prisma.OrderWhereInput = { deletedAt: null };

/**
 * Prisma `where` fragment for analytics aggregates: non-archived AND not a
 * DRAFT offline order. DRAFT orders are unconfirmed (no payment, no reserved
 * stock) so they must never count toward revenue, order counts, or status
 * breakdowns. Uses `NOT` (not a `status` key) so it composes with queries that
 * also filter `status` (e.g. `status: { notIn: ['CANCELLED'] }`) without one
 * overriding the other.
 */
export const realOrders: Prisma.OrderWhereInput = {
  deletedAt: null,
  // Net-zero exchange replacements (return.service.processExchange) carry
  // full-price line items but totalAmount=0; excluding them keeps order count,
  // AOV, and the item-level top-products SUM honest while genuine in-person
  // OFFLINE sales (isExchangeReplacement=false) still count.
  isExchangeReplacement: false,
  NOT: { status: 'DRAFT' },
};

/**
 * Raw-SQL predicate for the same rule, for `$queryRaw` analytics.
 * Pass the table alias used in the query (e.g. 'o'); omit for an
 * unaliased `orders` table.
 */
export const notArchivedSql = (alias?: string): string =>
  `${alias ? `${alias}.` : ''}"deletedAt" IS NULL`;

/** Raw-SQL predicate excluding net-zero exchange-replacement orders. */
export const notExchangeReplacementSql = (alias?: string): string =>
  `${alias ? `${alias}.` : ''}"isExchangeReplacement" = false`;
