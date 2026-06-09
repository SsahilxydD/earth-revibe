import { api } from '@/lib/api-client';

export interface MagicOrderStatus {
  found: boolean;
  orderNumber?: string;
  pointsEarned?: number;
}

/**
 * Wait for a Magic Checkout order to be finalized server-side.
 *
 * Needed for COD: a COD completion has no captured payment, so there is
 * nothing the client can put through /checkout/verify-payment (its HMAC
 * covers order_id|payment_id). The order is instead created by the
 * payment.pending webhook — this polls /checkout/order-status until it lands.
 *
 * Also used as a fallback when client-side verify fails for prepaid orders:
 * the payment.captured webhook finalizes those independently, so polling
 * here turns a "verification failed" dead-end into a confirmation.
 */
export async function awaitMagicOrder(
  razorpayOrderId: string,
  { attempts = 20, intervalMs = 2000 }: { attempts?: number; intervalMs?: number } = {}
): Promise<MagicOrderStatus | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const status = await api.get<MagicOrderStatus>(`/checkout/order-status/${razorpayOrderId}`);
      if (status.found) return status;
    } catch {
      // Transient (network blip, cold start) — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
