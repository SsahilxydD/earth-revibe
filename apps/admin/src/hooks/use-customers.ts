import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CustomerListParams } from '@/types';

// In the browser, use the same-origin proxy to avoid CORS.
// On the server, call Railway directly.
const API_BASE =
  typeof window !== 'undefined'
    ? '/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

export function useCustomers(params: CustomerListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ['admin-customers', params],
    queryFn: () => api.get(`/admin/customers?${searchParams.toString()}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => api.get(`/admin/customers/${id}`),
    enabled: !!id,
  });
}

/**
 * Autocomplete-friendly customer search for picker UIs (e.g. manual-order
 * creation). Skips firing until the query is at least 2 chars to keep
 * keystroke-thrash off the API. Returns the top 5 matches by name or phone.
 */
export type CustomerSearchHit = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  phoneVerified: boolean;
  isActive: boolean;
};

export function useCustomerSearch(query: string) {
  const trimmed = query.trim();
  return useQuery<{ customers: CustomerSearchHit[]; total: number }>({
    queryKey: ['admin-customer-search', trimmed],
    queryFn: () => api.get(`/admin/customers?search=${encodeURIComponent(trimmed)}&limit=5`),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });
}

export function useExportCustomersCSV() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/admin/customers/export-csv`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || 'Failed to export customers');
      }
      const truncated = res.headers.get('X-Export-Truncated') === 'true';
      const total = res.headers.get('X-Export-Total');
      const exported = res.headers.get('X-Export-Count');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return {
        truncated,
        total: total ? Number(total) : null,
        exported: exported ? Number(exported) : null,
      };
    },
  });
}

export function useToggleCustomerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/admin/customers/${id}/toggle-active`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customer'] });
    },
  });
}
