import type { PaginatedResponse } from '../types';

/**
 * Normalize flat pagination fields to a nested `pagination` object.
 *
 * API services return: { products: [...], total, page, limit, totalPages }
 * This converts to:    { products: [...], pagination: { total, page, limit, totalPages } }
 *
 * Safe to call on already-normalized responses (returns as-is if `pagination` exists).
 */
export function normalizePaginated<T = unknown, K extends string = string>(
  raw: any
): PaginatedResponse<T, K> {
  if (raw && raw.pagination) return raw;
  return {
    ...raw,
    pagination: {
      page: raw?.page ?? 1,
      limit: raw?.limit ?? 20,
      total: raw?.total ?? 0,
      totalPages: raw?.totalPages ?? 0,
    },
  } as PaginatedResponse<T, K>;
}
