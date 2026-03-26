'use client';

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Address, CreateAddressPayload, UpdateAddressPayload, ApiError } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const addressKeys = {
  all: ['addresses'] as const,
};

// ─── useAddresses ───────────────────────────────────────────────────────────

export function useAddresses(
  options?: Omit<UseQueryOptions<Address[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Address[], ApiError>({
    queryKey: addressKeys.all,
    queryFn: ({ signal }) => api.get<Address[]>('/addresses', signal),
    ...options,
  });
}

// ─── useCreateAddress ───────────────────────────────────────────────────────

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation<Address, ApiError, CreateAddressPayload>({
    mutationFn: (payload) => api.post<Address>('/addresses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.all });
    },
  });
}

// ─── useUpdateAddress ───────────────────────────────────────────────────────

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation<Address, ApiError, { id: string; payload: UpdateAddressPayload }>({
    mutationFn: ({ id, payload }) => api.put<Address>(`/addresses/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.all });
    },
  });
}

// ─── useDeleteAddress ───────────────────────────────────────────────────────

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.all });
    },
  });
}
