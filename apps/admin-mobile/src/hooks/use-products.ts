import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  price: string | number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  totalStock: number;
  images: Array<{ url: string; thumbnailUrl: string | null; isPrimary: boolean }>;
}

export interface AdminProductListResponse {
  products: AdminProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const PAGE_SIZE = 20;

export function useInfiniteProducts(filter: { search?: string; status?: string } = {}) {
  return useInfiniteQuery({
    queryKey: ['admin-products', filter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(PAGE_SIZE));
      if (filter.search) params.set('search', filter.search);
      if (filter.status) params.set('status', filter.status);
      return api.get<AdminProductListResponse>(`/admin/products?${params.toString()}`);
    },
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}
