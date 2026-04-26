import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AdminDiscount {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FLAT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';
  value: string | number;
  minOrderValue: string | number | null;
  maxDiscountAmount: string | number | null;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  startsAt: string;
  expiresAt: string;
}

export interface AdminDiscountListResponse {
  discounts: AdminDiscount[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useDiscounts() {
  return useQuery({
    queryKey: ['admin-discounts', 'all'],
    queryFn: () => api.get<AdminDiscountListResponse>('/admin/discounts?limit=100'),
  });
}

export function useToggleDiscountActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put<AdminDiscount>(`/admin/discounts/${id}`, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: ['admin-discounts'] });
      const prev = qc.getQueryData<AdminDiscountListResponse>(['admin-discounts', 'all']);
      if (prev) {
        qc.setQueryData<AdminDiscountListResponse>(['admin-discounts', 'all'], {
          ...prev,
          discounts: prev.discounts.map((d) => (d.id === id ? { ...d, isActive } : d)),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['admin-discounts', 'all'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin-discounts'] });
    },
  });
}
