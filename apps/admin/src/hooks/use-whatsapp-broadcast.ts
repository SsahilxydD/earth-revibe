import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface BroadcastQuota {
  used: number;
  remaining: number;
  limit: number;
  windowMinutes: number;
  resetAt: string | null;
}

export interface BroadcastResult {
  totalResolved: number;
  totalSent: number;
  totalFailed: number;
  failures: { phone: string; error: string }[];
  dryRun: boolean;
  sampleRecipients?: string[];
}

export interface BroadcastInput {
  recipients: { phone: string }[];
  dryRun?: boolean;
}

// Fixed value sent as {{1}} for every broadcast. The approved Utility
// template expects 1 body variable (order-number-style placeholder); admin
// UI doesn't ask for it because the same value going to every recipient is
// acceptable for this use case. Change here if the template wording changes.
const FIXED_BODY_PARAM = 'Update';

export function useBroadcastQuota() {
  return useQuery<BroadcastQuota>({
    queryKey: ['whatsapp-broadcast-quota'],
    queryFn: () => api.get<BroadcastQuota>('/admin/whatsapp/broadcast-quota'),
    refetchInterval: 30_000,
  });
}

export function useTripBroadcast() {
  const qc = useQueryClient();
  return useMutation<BroadcastResult, { message: string; code: string }, BroadcastInput>({
    mutationFn: ({ recipients, dryRun = false }) =>
      api.post<BroadcastResult>('/admin/whatsapp/broadcast-trip', {
        source: { type: 'recipients', recipients },
        params: [FIXED_BODY_PARAM],
        dryRun,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-broadcast-quota'] });
    },
  });
}

export interface TripOpeningInput {
  city: string;
  tripLabel: string;
  statuses?: ('PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLISTED')[];
  dryRun?: boolean;
}

export function useTripOpeningBroadcast() {
  const qc = useQueryClient();
  return useMutation<BroadcastResult, { message: string; code: string }, TripOpeningInput>({
    mutationFn: (input) =>
      api.post<BroadcastResult>('/admin/whatsapp/broadcast-trip-opening', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-broadcast-quota'] });
    },
  });
}
