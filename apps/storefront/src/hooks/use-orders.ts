'use client';

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Order, PaginatedResponse, ApiError } from '@/types';

import { normalizePaginated } from '@earth-revibe/shared';

type OrdersPage = PaginatedResponse<Order, 'orders'>;

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: { page?: number; limit?: number }) =>
    [...orderKeys.lists(), params ?? {}] as const,
  detail: (orderNumber: string) => [...orderKeys.all, 'detail', orderNumber] as const,
};

// ─── useOrders ──────────────────────────────────────────────────────────────

export function useOrders(
  params: { page?: number; limit?: number } = {},
  options?: Omit<UseQueryOptions<OrdersPage, ApiError>, 'queryKey' | 'queryFn'>
) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  return useQuery<OrdersPage, ApiError>({
    queryKey: orderKeys.list(params),
    queryFn: async ({ signal }) =>
      normalizePaginated<Order, 'orders'>(await api.get(`/orders${qs ? `?${qs}` : ''}`, signal)),
    ...options,
  });
}

// ─── useOrder ───────────────────────────────────────────────────────────────

export function useOrder(
  orderNumber: string,
  options?: Omit<UseQueryOptions<Order, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Order, ApiError>({
    queryKey: orderKeys.detail(orderNumber),
    queryFn: ({ signal }) => api.get<Order>(`/orders/${orderNumber}`, signal),
    enabled: !!orderNumber,
    ...options,
  });
}
