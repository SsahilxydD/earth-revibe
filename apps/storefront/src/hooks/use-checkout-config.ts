'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface CheckoutConfig {
  codFee: number;
}

/**
 * Public checkout config (currently the COD fee). Single source of truth so
 * the UI shows the exact fee the server will charge — never a hardcoded value
 * that can drift from `COD_FEE`. Cached aggressively; it rarely changes.
 */
export function useCheckoutConfig() {
  return useQuery({
    queryKey: ['checkout-config'],
    queryFn: () => api.get<CheckoutConfig>('/checkout/config'),
    staleTime: 60 * 60 * 1000,
  });
}
