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

// ─── useAddToWishlist (optimistic) ─────────────────────────────────────────

export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation<WishlistItem, ApiError, string>({
    mutationFn: (productId) => api.post<WishlistItem>('/wishlist', { productId }),
    // Optimistic update: immediately add a placeholder item
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.all });
      const previous = queryClient.getQueryData<WishlistItem[]>(wishlistKeys.all);
      queryClient.setQueryData<WishlistItem[]>(wishlistKeys.all, (old) => [
        ...(old || []),
        {
          id: `optimistic-${productId}`,
          product: { id: productId } as any,
          createdAt: new Date().toISOString(),
        },
      ]);
      return { previous };
    },
    onError: (_err, _productId, context: any) => {
      // Revert on failure
      if (context?.previous) {
        queryClient.setQueryData(wishlistKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

// ─── useRemoveFromWishlist (optimistic) ────────────────────────────────────

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (productId) => api.delete(`/wishlist/${productId}`),
    // Optimistic: immediately remove the item
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: wishlistKeys.all });
      const previous = queryClient.getQueryData<WishlistItem[]>(wishlistKeys.all);
      queryClient.setQueryData<WishlistItem[]>(wishlistKeys.all, (old) =>
        (old || []).filter((item) => item.product?.id !== productId)
      );
      return { previous };
    },
    onError: (_err, _productId, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(wishlistKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}
