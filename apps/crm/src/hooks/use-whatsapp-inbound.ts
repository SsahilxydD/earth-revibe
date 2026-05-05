import { useInfiniteQuery } from '@tanstack/react-query';
import type { WhatsAppInboundResponse } from '@earth-revibe/shared';
import { api } from '@/lib/api-client';

interface UseWhatsAppInboundParams {
  linkedUser?: 'true' | 'false';
  repliesOnly?: 'true' | 'false';
}

export function useWhatsAppInbound(params: UseWhatsAppInboundParams = {}) {
  return useInfiniteQuery<WhatsAppInboundResponse, Error>({
    queryKey: ['crm-whatsapp-inbound', params],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set('limit', '50');
      if (pageParam) sp.set('cursor', pageParam as string);
      if (params.linkedUser) sp.set('linkedUser', params.linkedUser);
      if (params.repliesOnly) sp.set('repliesOnly', params.repliesOnly);
      return api.get<WhatsAppInboundResponse>(`/admin/whatsapp-inbound?${sp.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
