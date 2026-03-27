import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import type { InventoryListParams } from '@/types';

export function useInventory(params: InventoryListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ['admin-inventory', params],
    queryFn: () => api.get(`/admin/inventory?${searchParams.toString()}`),
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ['admin-inventory-summary'],
    queryFn: () => api.get('/admin/inventory/summary'),
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, stock }: { variantId: string; stock: number }) =>
      api.put(`/admin/inventory/${variantId}/stock`, { stock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-summary'] });
      revalidateStorefront(['products']);
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      variantId,
      adjustment,
      reason,
    }: {
      variantId: string;
      adjustment: number;
      reason: string;
    }) => api.post(`/admin/inventory/${variantId}/adjust`, { adjustment, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-summary'] });
      revalidateStorefront(['products']);
    },
  });
}

export function useBulkUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { variantId: string; stock: number }[]) =>
      api.put('/admin/inventory/bulk', { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-summary'] });
      revalidateStorefront(['products']);
    },
  });
}
