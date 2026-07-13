'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import type {
  CreateHomepageBlockInput,
  HomepageBlockRecord,
  HomepageFeaturedContent,
  HomepageHeroContent,
  UpdateHomepageBlockInput,
} from '@earth-revibe/shared';

const BLOCKS_KEY = ['homepage-blocks'];

export function useHomepageBlocks() {
  return useQuery<HomepageBlockRecord[]>({
    queryKey: BLOCKS_KEY,
    queryFn: () => api.get<HomepageBlockRecord[]>('/admin/homepage'),
  });
}

/** Shared onSuccess: refetch blocks + instantly revalidate the storefront's ISR cache. */
function useHomepageInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: BLOCKS_KEY });
    revalidateStorefront(['homepage']);
  };
}

export function useUpsertHero() {
  const invalidate = useHomepageInvalidation();
  return useMutation({
    mutationFn: (content: HomepageHeroContent) =>
      api.put<HomepageBlockRecord>('/admin/homepage/hero', content),
    onSuccess: invalidate,
  });
}

export function useUpsertFeatured() {
  const invalidate = useHomepageInvalidation();
  return useMutation({
    mutationFn: (content: HomepageFeaturedContent) =>
      api.put<HomepageBlockRecord>('/admin/homepage/featured', content),
    onSuccess: invalidate,
  });
}

export function useCreateHomepageBlock() {
  const invalidate = useHomepageInvalidation();
  return useMutation({
    mutationFn: (input: CreateHomepageBlockInput) =>
      api.post<HomepageBlockRecord>('/admin/homepage/blocks', input),
    onSuccess: invalidate,
  });
}

export function useUpdateHomepageBlock() {
  const invalidate = useHomepageInvalidation();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHomepageBlockInput }) =>
      api.patch<HomepageBlockRecord>(`/admin/homepage/blocks/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteHomepageBlock() {
  const invalidate = useHomepageInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/homepage/blocks/${id}`),
    onSuccess: invalidate,
  });
}

export function useReorderHomepageBlocks() {
  const invalidate = useHomepageInvalidation();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.put('/admin/homepage/blocks/reorder', { orderedIds }),
    onSuccess: invalidate,
  });
}
