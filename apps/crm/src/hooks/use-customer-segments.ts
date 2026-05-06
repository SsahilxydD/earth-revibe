import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CustomerSegmentInput,
  CustomerSegmentRow,
  CustomerSegmentsResponse,
} from '@earth-revibe/shared';
import { api } from '@/lib/api-client';
import { toast } from '@earth-revibe/ui/toast';

const KEY = ['crm-customer-segments'];

export function useCustomerSegments() {
  return useQuery<CustomerSegmentsResponse, Error>({
    queryKey: KEY,
    queryFn: () => api.get<CustomerSegmentsResponse>('/admin/customer-segments'),
  });
}

export function useCreateCustomerSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerSegmentInput) => api.post('/admin/customer-segments', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Segment created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create segment'),
  });
}

export function useUpdateCustomerSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerSegmentInput }) =>
      api.put(`/admin/customer-segments/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Segment updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update segment'),
  });
}

export function useDeleteCustomerSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/customer-segments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Segment deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete segment'),
  });
}

export function useRefreshCustomerSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<CustomerSegmentRow> =>
      api.post<CustomerSegmentRow>(`/admin/customer-segments/${id}/refresh`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Segment refreshed');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to refresh'),
  });
}
