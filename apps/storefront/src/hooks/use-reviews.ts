'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { productKeys } from './use-products';
import type { Review, CreateReviewPayload, ApiError } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const reviewKeys = {
  all: ['reviews'] as const,
  byProduct: (productId: string) => [...reviewKeys.all, productId] as const,
};

// ─── useProductReviews ──────────────────────────────────────────────────────

export function useProductReviews(
  productId: string,
  options?: Omit<UseQueryOptions<Review[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Review[], ApiError>({
    queryKey: reviewKeys.byProduct(productId),
    queryFn: ({ signal }) => api.get<Review[]>(`/products/${productId}/reviews`, signal),
    enabled: !!productId,
    ...options,
  });
}

// ─── useCreateReview ────────────────────────────────────────────────────────

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation<Review, ApiError, CreateReviewPayload>({
    mutationFn: ({ productId, ...body }) =>
      api.post<Review>(`/products/${productId}/reviews`, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: reviewKeys.byProduct(variables.productId),
      });
      // Also invalidate the product detail so reviewCount / averageRating update
      queryClient.invalidateQueries({ queryKey: productKeys.details() });
    },
  });
}
