import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EngagementRuleInput, EngagementRulesResponse } from '@earth-revibe/shared';
import { api } from '@/lib/api-client';
import { toast } from '@earth-revibe/ui/toast';

const KEY = ['crm-engagement-rules'];

export function useEngagementRules() {
  return useQuery<EngagementRulesResponse, Error>({
    queryKey: KEY,
    queryFn: () => api.get<EngagementRulesResponse>('/admin/engagement-rules'),
  });
}

export function useCreateEngagementRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EngagementRuleInput) => api.post('/admin/engagement-rules', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Rule created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create rule'),
  });
}

export function useUpdateEngagementRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EngagementRuleInput }) =>
      api.put(`/admin/engagement-rules/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Rule updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update rule'),
  });
}

export function useDeleteEngagementRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/engagement-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Rule deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete rule'),
  });
}
