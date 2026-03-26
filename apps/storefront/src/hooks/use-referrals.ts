'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Referral, ApiError } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const referralKeys = {
  all: ['referrals'] as const,
  info: () => [...referralKeys.all, 'info'] as const,
  list: () => [...referralKeys.all, 'list'] as const,
};

// ─── Referral Info ──────────────────────────────────────────────────────────

interface ReferralInfo {
  referralCode: string;
  referralUrl: string;
  totalReferrals: number;
  totalReward: number;
}

export function useReferralInfo(
  options?: Omit<UseQueryOptions<ReferralInfo, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ReferralInfo, ApiError>({
    queryKey: referralKeys.info(),
    queryFn: ({ signal }) => api.get<ReferralInfo>('/referrals/info', signal),
    ...options,
  });
}

// ─── useReferrals ───────────────────────────────────────────────────────────

export function useReferrals(
  options?: Omit<UseQueryOptions<Referral[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Referral[], ApiError>({
    queryKey: referralKeys.list(),
    queryFn: ({ signal }) => api.get<Referral[]>('/referrals', signal),
    ...options,
  });
}
