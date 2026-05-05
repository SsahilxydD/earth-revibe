import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface CrmCustomerRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  loyaltyPoints: number;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { orders: number };
}

export interface CrmCustomersResponse {
  customers: CrmCustomerRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CrmCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'loyaltyPoints';
  sortOrder?: 'asc' | 'desc';
}

export function useCustomers(params: CrmCustomersParams = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  return useQuery({
    queryKey: ['crm-customers', params],
    queryFn: () => api.get<CrmCustomersResponse>(`/admin/customers?${sp.toString()}`),
  });
}
