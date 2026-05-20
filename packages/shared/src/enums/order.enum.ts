/**
 * Six-status order lifecycle. Collapsed from the previous nine-state enum so
 * the customer + admin UIs render the same buckets and the carrier-truth
 * sync logic doesn't have to thread three "in-transit" sub-states.
 *
 * Old → new mapping (forward-only data migration handled in
 * 20260520190000_collapse_order_status_to_six_values):
 *   PLACED          → PENDING
 *   PROCESSING      → SHIPPING
 *   SHIPPED         → SHIPPING
 *   OUT_FOR_DELIVERY→ SHIPPING
 *   REFUNDED        → RETURNED   (financial refund tracked on Payment.status)
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum OrderSource {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PICKED_UP = 'PICKED_UP',
  RECEIVED = 'RECEIVED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  COMPLETED = 'COMPLETED',
}
