'use client';

import { useQuery, useInfiniteQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Product, Category, ProductListParams, PaginatedResponse, ApiError } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (slug: string) => [...productKeys.details(), slug] as const,
  related: (categorySlug: string, excludeId: string) =>
    [...productKeys.all, 'related', categorySlug, excludeId] as const,
  categories: ['categories'] as const,
};

// Shared normalizer — converts flat pagination from API to nested { pagination } object
import { normalizePaginated } from '@earth-revibe/shared';

// ─── Build Query String ─────────────────────────────────────────────────────

function buildProductQuery(params: ProductListParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.category) searchParams.set('category', params.category);
  if (params.minPrice != null) searchParams.set('minPrice', String(params.minPrice));
  if (params.maxPrice != null) searchParams.set('maxPrice', String(params.maxPrice));
  if (params.sizes?.length) searchParams.set('sizes', params.sizes.join(','));
  if (params.colors?.length) searchParams.set('colors', params.colors.join(','));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.isFeatured != null) searchParams.set('isFeatured', String(params.isFeatured));
  if (params.status) searchParams.set('status', params.status);

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

export function useRelatedProducts(categorySlug: string | undefined, excludeId: string) {
  const categoryParam = categorySlug ? `&category=${categorySlug}` : '';
  const key = categorySlug || 'all';
  return useQuery<ProductsPage, ApiError>({
    queryKey: productKeys.related(key, excludeId),
    queryFn: async ({ signal }) =>
      normalizePaginated<Product, 'products'>(
        await api.get(`/products?limit=20&sortBy=createdAt&sortOrder=desc${categoryParam}`, signal)
      ),
    select: (data) => ({
      ...data,
      products: data.products.filter((p) => p.id !== excludeId),
    }),
  });
}

// ─── useCategories ──────────────────────────────────────────────────────────

export function useCategories(
  options?: Omit<UseQueryOptions<Category[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Category[], ApiError>({
    queryKey: productKeys.categories,
    queryFn: ({ signal }) => api.get<Category[]>('/categories', signal),
    staleTime: 10 * 60 * 1000, // categories change infrequently
    ...options,
  });
}
