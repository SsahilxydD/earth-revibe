'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { WishlistItem, ApiError } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const wishlistKeys = {
  all: ['wishlist'] as const,
};

// ─── useWishlist ────────────────────────────────────────────────────────────

export function useWishlist(
  options?: Omit<UseQueryOptions<WishlistItem[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<WishlistItem[], ApiError>({
    queryKey: wishlistKeys.all,
    queryFn: ({ signal }) => api.get<WishlistItem[]>('/wishlist', signal),
    ...options,
  });
}

// ─── useAddToWishlist ───────────────────────────────────────────────────────

export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation<WishlistItem, ApiError, string>({
    mutationFn: (productId) => api.post<WishlistItem>('/wishlist', { productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

// ─── useRemoveFromWishlist ──────────────────────────────────────────────────

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (productId) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}
