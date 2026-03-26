'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { LoyaltyTransaction, ApiError } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const loyaltyKeys = {
  all: ['loyalty'] as const,
  balance: () => [...loyaltyKeys.all, 'balance'] as const,
  transactions: () => [...loyaltyKeys.all, 'transactions'] as const,
};

// ─── useLoyaltyBalance ──────────────────────────────────────────────────────

interface LoyaltyBalance {
  points: number;
  tier: string;
  nextTierAt: number | null;
}

export function useLoyaltyBalance(
  options?: Omit<UseQueryOptions<LoyaltyBalance, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<LoyaltyBalance, ApiError>({
    queryKey: loyaltyKeys.balance(),
    queryFn: ({ signal }) => api.get<LoyaltyBalance>('/loyalty/balance', signal),
    ...options,
  });
}

// ─── useLoyaltyTransactions ─────────────────────────────────────────────────

export function useLoyaltyTransactions(
  options?: Omit<UseQueryOptions<LoyaltyTransaction[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<LoyaltyTransaction[], ApiError>({
    queryKey: loyaltyKeys.transactions(),
    queryFn: ({ signal }) => api.get<LoyaltyTransaction[]>('/loyalty/transactions', signal),
    ...options,
  });
}
