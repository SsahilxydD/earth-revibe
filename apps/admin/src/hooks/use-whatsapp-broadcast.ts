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
  params?: string[];
  dryRun?: boolean;
}

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
    mutationFn: ({ recipients, params = [], dryRun = false }) =>
      api.post<BroadcastResult>('/admin/whatsapp/broadcast-trip', {
        source: { type: 'recipients', recipients },
        params,
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
