import { Prisma } from '@earth-revibe/db';

/**
 * Mark a COD payment as collected once its order is DELIVERED.
 *
 * COD payments are created PENDING at checkout ("Payment stays PENDING until
 * collected on delivery" — checkout.service finalizeOrderFromPending) but the
 * settle half never existed, so every COD order showed payment-pending
 * forever. Razorpay never emits a capture event for COD (no online
 * transaction), so delivery IS the settlement signal: the courier collected
 * the cash.
 *
 * Idempotent + prepaid-safe by construction: only a PENDING payment flips to
 * CAPTURED (prepaid orders are CAPTURED at creation; AUTHORIZED/FAILED/
 * REFUNDED are deliberately untouched). Safe to call on every DELIVERED
 * event, mirroring awardOrderPoints.
 *
 * MUST run inside a transaction alongside the delivery-time side effects.
 * Returns true if a payment was settled.
 */
export async function settleCodPaymentOnDelivery(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<boolean> {
  const result = await tx.payment.updateMany({
    where: { orderId, status: 'PENDING' },
    data: { status: 'CAPTURED', paidAt: new Date() },
  });
  return result.count > 0;
}
