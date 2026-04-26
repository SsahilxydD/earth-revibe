import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  loyaltyPoints: number;
  createdAt: string;
  _count?: { orders: number };
}

export interface AdminCustomerListResponse {
  customers: AdminCustomer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_SIZE = 20;

export function useInfiniteCustomers(filter: { search?: string } = {}) {
  return useInfiniteQuery({
    queryKey: ['admin-customers', filter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(PAGE_SIZE));
      if (filter.search) params.set('search', filter.search);
      return api.get<AdminCustomerListResponse>(`/admin/customers?${params.toString()}`);
    },
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}
