import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ReturnQuery } from '@/types';

export function useReturns(params: Partial<ReturnQuery> = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.set(key, String(value));
  });
  return useQuery({
    queryKey: ['admin-returns', params],
    queryFn: () => api.get(`/admin/returns?${searchParams.toString()}`),
  });
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: ['admin-return', id],
    queryFn: () => api.get(`/admin/returns/${id}`),
    enabled: !!id,
  });
}

export function useUpdateReturnStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
      restock,
    }: {
      id: string;
      status: string;
      adminNote?: string;
      restock?: boolean;
    }) => api.put(`/admin/returns/${id}/status`, { status, adminNote, restock }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-return', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      // Approving an exchange / receiving stock can touch orders + inventory.
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}
