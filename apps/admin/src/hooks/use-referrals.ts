import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/** Referral cash payouts (admin). Defaults to the pending list. */
export function useReferralPayouts(status: 'pending' | 'paid' | 'all' = 'pending') {
  return useQuery({
    queryKey: ['admin-referral-payouts', status],
    queryFn: () => api.get(`/admin/referrals/payouts?status=${status}`),
  });
}

/** Mark a referral payout as paid (after paying the referrer's UPI manually). */
export function useMarkReferralPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payoutRef }: { id: string; payoutRef?: string }) =>
      api.post(`/admin/referrals/${id}/mark-paid`, payoutRef ? { payoutRef } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-referral-payouts'] });
    },
  });
}
