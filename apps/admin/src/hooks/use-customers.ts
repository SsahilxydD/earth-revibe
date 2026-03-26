import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import type { CustomerListParams } from '@/types';

// Ensure API_BASE is always an absolute URL
function resolveApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}`;
}
const API_BASE = resolveApiBase();

/** Get auth token from Supabase session for raw fetch calls that bypass the API client */
async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

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

export function useExportCustomersCSV() {
  return useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/admin/customers/export-csv`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
