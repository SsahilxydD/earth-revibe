import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Drop-alert admin hooks (PR 10b commit 2/3). Pairs with the backend at
// apps/api/src/routes/drop-alert.routes.ts. The dispatch mutation invalidates
// admin-product so the UI can re-render anything keyed off send history later.

export interface DropAlertCard {
  imageUrl: string;
  productName: string;
  priceFormatted: string;
  productSlug: string;
}

export interface DropAlertDryRun {
  eligibleCount: number;
  budgetRemaining: number;
  willSendCount: number;
}

export interface DropAlertDispatchResult {
  notified: number;
  failed: number;
  skippedBudget: number;
}

export function useDropAlertDryRun(productId: string | undefined, enabled: boolean) {
  return useQuery<DropAlertDryRun>({
    queryKey: ['admin-drop-alert-dry-run', productId],
    queryFn: () => api.get(`/admin/products/${productId}/drop-alert/dry-run`),
    enabled: !!productId && enabled,
    staleTime: 30_000,
  });
}

export function useDispatchDropAlert() {
  const queryClient = useQueryClient();
  return useMutation<
    DropAlertDispatchResult,
    Error,
    { productId: string; dropName: string; cards: DropAlertCard[] }
  >({
    mutationFn: ({ productId, dropName, cards }) =>
      api.post(`/admin/products/${productId}/drop-alert/dispatch`, { dropName, cards }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drop-alert-dry-run'] });
    },
  });
}
