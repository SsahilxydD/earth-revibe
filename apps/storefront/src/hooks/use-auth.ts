'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  User,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
  ApiError,
} from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const authKeys = {
  user: ['auth', 'user'] as const,
};

// ─── useUser ────────────────────────────────────────────────────────────────

export function useUser(
  options?: Omit<UseQueryOptions<User, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<User, ApiError>({
    queryKey: authKeys.user,
    queryFn: ({ signal }) => api.get<User>('/auth/me', signal),
    retry: false,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

// ─── useLogin ───────────────────────────────────────────────────────────────

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, LoginPayload>({
    mutationFn: (payload) => api.post<User>('/auth/login', payload),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

// ─── useRegister ────────────────────────────────────────────────────────────

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, RegisterPayload>({
    mutationFn: (payload) => api.post<User>('/auth/register', payload),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

// ─── useLogout ──────────────────────────────────────────────────────────────

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.user, null);
      queryClient.clear();
    },
  });
}

// ─── useUpdateProfile ───────────────────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, UpdateProfilePayload>({
    mutationFn: (payload) => api.put<User>('/auth/profile', payload),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

// ─── useChangePassword ─────────────────────────────────────────────────────

export function useChangePassword() {
  return useMutation<void, ApiError, ChangePasswordPayload>({
    mutationFn: (payload) => api.put('/auth/change-password', payload),
  });
}
