import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { TravelApplicationStatus, TravelApplicationUpdateInput } from '@earth-revibe/shared';

const API_BASE =
  typeof window !== 'undefined'
    ? '/api/v1'
    : process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';

export interface TravelApplicationListParams {
  page?: number;
  limit?: number;
  status?: TravelApplicationStatus | '';
  search?: string;
  sortBy?: 'createdAt' | 'applicationNumber' | 'name' | 'city';
  sortOrder?: 'asc' | 'desc';
}

export interface TravelApplicationRow {
  id: string;
  applicationNumber: string;
  userId: string | null;
  phone: string;
  email: string | null;
  name: string;
  age: number;
  city: string;
  instagram: string;
  travelerType: string;
  whyJoin: string;
  pastTravel: string;
  tripPrefs: string[];
  meetBefore: string;
  curated: string;
  status: TravelApplicationStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  notifiedAt: string | null;
  notifiedStatus: TravelApplicationStatus | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  data: TravelApplicationRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useTravelApplications(params: TravelApplicationListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.set(key, String(value));
  });
  return useQuery({
    queryKey: ['admin-travel-applications', params],
    queryFn: () => api.get<ListResponse>(`/admin/travel-applications?${searchParams.toString()}`),
  });
}

export function useTravelApplication(id: string) {
  return useQuery({
    queryKey: ['admin-travel-application', id],
    queryFn: () => api.get<TravelApplicationRow>(`/admin/travel-applications/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTravelApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TravelApplicationUpdateInput }) =>
      api.patch<TravelApplicationRow>(`/admin/travel-applications/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-travel-applications'] });
      qc.invalidateQueries({ queryKey: ['admin-travel-application'] });
    },
  });
}

export function useExportTravelApplicationsCSV() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/admin/travel-applications/export-csv`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || 'Failed to export applications');
      }
      const truncated = res.headers.get('X-Export-Truncated') === 'true';
      const total = res.headers.get('X-Export-Total');
      const exported = res.headers.get('X-Export-Count');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel-applications-${new Date().toISOString().split('T')[0]}.csv`;
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
