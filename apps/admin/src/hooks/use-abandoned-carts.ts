import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type AbandonedCartKind = 'user' | 'guest';

export interface AbandonedCartItem {
  name: string;
  quantity: number;
  price: number;
  slug: string;
}

export interface AbandonedCartRow {
  id: string;
  kind: AbandonedCartKind;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  itemCount: number;
  cartTotal: number;
  hasWhatsApp: boolean;
  hasEmail: boolean;
  recoverySentAt: string | null;
  updatedAt: string;
  createdAt: string;
  items: AbandonedCartItem[];
}

export interface AbandonedCartListParams {
  page?: number;
  limit?: number;
  status?: 'all' | 'pending' | 'sent';
  search?: string;
}

interface ListResponse {
  data: AbandonedCartRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { totalPending: number; totalSent: number; usersPending: number; guestsPending: number };
}

export interface SweepResult {
  ran: boolean;
  tracked: number;
  emailed: number;
  whatsapped: number;
  guestEmailed: number;
  deferred: number;
}

export interface SendOneResult {
  kind: AbandonedCartKind;
  id: string;
  whatsapped: boolean;
  emailed: boolean;
  marked: boolean;
  deferred: boolean;
}

export function useAbandonedCarts(params: AbandonedCartListParams = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  return useQuery({
    queryKey: ['admin-abandoned-carts', params],
    queryFn: () => api.get<ListResponse>(`/admin/abandoned-carts?${sp.toString()}`),
  });
}

export function useRunAbandonedCartSweep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<SweepResult>('/admin/abandoned-carts/run', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-abandoned-carts'] });
    },
  });
}

export function useSendAbandonedCartRecovery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: AbandonedCartKind; id: string }) =>
      api.post<SendOneResult>(`/admin/abandoned-carts/${kind}/${id}/send`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-abandoned-carts'] });
    },
  });
}
