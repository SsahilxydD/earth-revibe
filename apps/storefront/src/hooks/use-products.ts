'use client';

import { useQuery, useInfiniteQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Product, ProductListParams, PaginatedResponse, ApiError } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (slug: string) => [...productKeys.details(), slug] as const,
  related: (categorySlug: string, excludeId: string) =>
    [...productKeys.all, 'related', categorySlug, excludeId] as const,
};

// Shared normalizer — converts flat pagination from API to nested { pagination } object
import { normalizePaginated } from '@earth-revibe/shared';

// ─── Build Query String ─────────────────────────────────────────────────────

function buildProductQuery(params: ProductListParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.category) {
    const value = Array.isArray(params.category) ? params.category.join(',') : params.category;
    if (value) searchParams.set('category', value);
  }
  if (params.minPrice != null) searchParams.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.sizes?.length) searchParams.set('size', params.sizes.join(','));
  if (params.colors?.length) searchParams.set('color', params.colors.join(','));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.isFeatured != null) searchParams.set('isFeatured', String(params.isFeatured));
  if (params.status) searchParams.set('status', params.status);
  if ((params as any).tag) searchParams.set('tag', (params as any).tag);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ─── useProducts ────────────────────────────────────────────────────────────

type ProductsPage = PaginatedResponse<Product, 'products'>;

export function useProducts(
  params: ProductListParams = {},
  options?: Omit<UseQueryOptions<ProductsPage, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductsPage, ApiError>({
    queryKey: productKeys.list(params),
    queryFn: async ({ signal }) =>
      normalizePaginated<Product, 'products'>(
        await api.get(`/products${buildProductQuery(params)}`, signal)
      ),
    ...options,
  });
}

// ─── useProduct ─────────────────────────────────────────────────────────────

export function useProduct(
  slug: string,
  options?: Omit<UseQueryOptions<Product, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Product, ApiError>({
    queryKey: productKeys.detail(slug),
    queryFn: ({ signal }) => api.get<Product>(`/products/${slug}`, signal),
    enabled: !!slug,
    ...options,
  });
}

// ─── useInfiniteProducts ────────────────────────────────────────────────────

export function useInfiniteProducts(params: Omit<ProductListParams, 'page'> = {}) {
  return useInfiniteQuery<ProductsPage, ApiError>({
    queryKey: [...productKeys.lists(), 'infinite', params],
    queryFn: async ({ pageParam, signal }) => {
      const query = buildProductQuery({
        ...params,
        page: pageParam as number,
        limit: params.limit || 12,
      });
      return normalizePaginated<Product, 'products'>(await api.get(`/products${query}`, signal));
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    // Keep previous data during param changes so there's never a blank frame
    placeholderData: (prev) => prev,
  });
}

// ─── useRelatedProducts ─────────────────────────────────────────────────────

export function useRelatedProducts(_categorySlug: string | undefined, excludeId: string) {
  return useInfiniteQuery<ProductsPage, ApiError>({
    queryKey: productKeys.related('all', excludeId),
    queryFn: async ({ pageParam, signal }) =>
      normalizePaginated<Product, 'products'>(
        await api.get(
          `/products?limit=12&sortBy=createdAt&sortOrder=desc&page=${pageParam}`,
          signal
        )
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    select: (data) => ({
      ...data,
      pages: data.pages.map((p) => ({
        ...p,
        products: p.products.filter((prod) => prod.id !== excludeId),
      })),
    }),
  });
}
