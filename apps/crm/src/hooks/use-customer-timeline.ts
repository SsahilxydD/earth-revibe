import { useInfiniteQuery } from '@tanstack/react-query';
import type { TimelineEventType, TimelineResponse } from '@earth-revibe/shared';
import { api } from '@/lib/api-client';

interface UseCustomerTimelineParams {
  userId: string;
  types?: TimelineEventType[];
  enabled?: boolean;
}

export function useCustomerTimeline({ userId, types, enabled = true }: UseCustomerTimelineParams) {
  const typesParam = types && types.length > 0 ? types.join(',') : undefined;

  return useInfiniteQuery<TimelineResponse, Error>({
    queryKey: ['crm-customer-timeline', userId, typesParam],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set('limit', '50');
      if (pageParam) sp.set('cursor', pageParam as string);
      if (typesParam) sp.set('types', typesParam);
      return api.get<TimelineResponse>(
        `/admin/customers/${encodeURIComponent(userId)}/timeline?${sp.toString()}`
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: enabled && Boolean(userId),
  });
}
