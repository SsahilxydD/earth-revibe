'use client';

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { BlogPost, BlogListParams, PaginatedResponse, ApiError } from '@/types';

import { normalizePaginated } from '@earth-revibe/shared';

type PostsPage = PaginatedResponse<BlogPost, 'posts'>;

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const blogKeys = {
  all: ['blog'] as const,
  lists: () => [...blogKeys.all, 'list'] as const,
  list: (params: BlogListParams) => [...blogKeys.lists(), params] as const,
  detail: (slug: string) => [...blogKeys.all, 'detail', slug] as const,
};

// ─── useBlogPosts ───────────────────────────────────────────────────────────

export function useBlogPosts(
  params: BlogListParams = {},
  options?: Omit<UseQueryOptions<PostsPage, ApiError>, 'queryKey' | 'queryFn'>
) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  const qs = searchParams.toString();

  return useQuery<PostsPage, ApiError>({
    queryKey: blogKeys.list(params),
    queryFn: async ({ signal }) =>
      normalizePaginated<BlogPost, 'posts'>(await api.get(`/blog${qs ? `?${qs}` : ''}`, signal)),
    ...options,
  });
}

// ─── useBlogPost ────────────────────────────────────────────────────────────

export function useBlogPost(
  slug: string,
  options?: Omit<UseQueryOptions<BlogPost, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<BlogPost, ApiError>({
    queryKey: blogKeys.detail(slug),
    queryFn: ({ signal }) => api.get<BlogPost>(`/blog/${slug}`, signal),
    enabled: !!slug,
    ...options,
  });
}
