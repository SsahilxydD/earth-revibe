'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  SupportTicket,
  CreateTicketPayload,
  ReplyToTicketPayload,
  ApiError,
} from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const supportKeys = {
  all: ['support'] as const,
  lists: () => [...supportKeys.all, 'list'] as const,
  detail: (ticketNumber: string) => [...supportKeys.all, 'detail', ticketNumber] as const,
};

// ─── useTickets ─────────────────────────────────────────────────────────────

export function useTickets(
  options?: Omit<UseQueryOptions<SupportTicket[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SupportTicket[], ApiError>({
    queryKey: supportKeys.lists(),
    queryFn: ({ signal }) => api.get<SupportTicket[]>('/support/tickets', signal),
    ...options,
  });
}

// ─── useTicket ──────────────────────────────────────────────────────────────

export function useTicket(
  ticketNumber: string,
  options?: Omit<UseQueryOptions<SupportTicket, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SupportTicket, ApiError>({
    queryKey: supportKeys.detail(ticketNumber),
    queryFn: ({ signal }) =>
      api.get<SupportTicket>(`/support/tickets/${ticketNumber}`, signal),
    enabled: !!ticketNumber,
    ...options,
  });
}

// ─── useCreateTicket ────────────────────────────────────────────────────────

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation<SupportTicket, ApiError, CreateTicketPayload>({
    mutationFn: (payload) =>
      api.post<SupportTicket>('/support/tickets', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.lists() });
    },
  });
}

// ─── useReplyToTicket ───────────────────────────────────────────────────────

export function useReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation<
    SupportTicket,
    ApiError,
    { ticketNumber: string; payload: ReplyToTicketPayload }
  >({
    mutationFn: ({ ticketNumber, payload }) =>
      api.post<SupportTicket>(
        `/support/tickets/${ticketNumber}/replies`,
        payload
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: supportKeys.detail(variables.ticketNumber),
      });
      queryClient.invalidateQueries({ queryKey: supportKeys.lists() });
    },
  });
}
