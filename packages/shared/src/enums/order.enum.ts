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
  /**
   * Unconfirmed offline draft. Created by an admin for an in-person sale whose
   * payment hasn't landed yet. Stock is NOT reserved and the order is excluded
   * from revenue, order counts, and customer history until it's confirmed via
   * adminOrderService.confirmOfflineOrder (which requires a phone-verified
   * customer). DRAFT only ever pairs with source=OFFLINE.
   */
  DRAFT = 'DRAFT',
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

/**
 * Whether a return is a refund (money back) or an exchange (a replacement
 * variant is shipped). Exchanges are auto-processed within the 72h window;
 * refunds are issued manually by an admin after the item is received back.
 */
export enum ReturnType {
  REFUND = 'REFUND',
  EXCHANGE = 'EXCHANGE',
}

/**
 * Customer-selected reason for a return. DEFECTIVE / DAMAGED_IN_TRANSIT skip
 * auto-restock when the item is received (it can't go back on the shelf).
 */
export enum ReturnReason {
  DEFECTIVE = 'DEFECTIVE',
  DAMAGED_IN_TRANSIT = 'DAMAGED_IN_TRANSIT',
  WRONG_ITEM = 'WRONG_ITEM',
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  SIZE_TOO_SMALL = 'SIZE_TOO_SMALL',
  SIZE_TOO_LARGE = 'SIZE_TOO_LARGE',
  CHANGED_MIND = 'CHANGED_MIND',
  OTHER = 'OTHER',
}
