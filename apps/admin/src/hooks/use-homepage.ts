'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { revalidateStorefront } from '@/lib/revalidate-storefront';

export interface HomepageSection {
  id: string;
  label: string;
  href: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function useHomepageSections() {
  return useQuery<HomepageSection[]>({
    queryKey: ['homepage-sections'],
    queryFn: () => api.get<HomepageSection[]>('/admin/homepage'),
  });
}

export function useUpdateHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HomepageSection> }) =>
      api.patch<HomepageSection>(`/admin/homepage/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      revalidateStorefront(['homepage']);
    },
  });
}

export function useCreateHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { label: string; href: string; sortOrder?: number }) =>
      api.post<HomepageSection>('/admin/homepage', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      revalidateStorefront(['homepage']);
    },
  });
}

export function useReorderHomepageSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.put('/admin/homepage/reorder', { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      revalidateStorefront(['homepage']);
    },
  });
}

export function useDeleteHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/homepage/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-sections'] });
      revalidateStorefront(['homepage']);
    },
  });
}
