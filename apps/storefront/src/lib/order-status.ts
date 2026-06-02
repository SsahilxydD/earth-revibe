// Customer-facing labels + colours for every OrderStatus. Shared by the order
// list, order detail, and returns pages so status presentation stays consistent.
export const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#999999' },
  PENDING: { label: 'Order Placed', color: '#EAB308' },
  CONFIRMED: { label: 'Confirmed', color: '#3B82F6' },
  SHIPPING: { label: 'On Its Way', color: '#8B5CF6' },
  DELIVERED: { label: 'Delivered', color: '#22C55E' },
  CANCELLED: { label: 'Cancelled', color: '#999999' },
  RETURNED: { label: 'Returned', color: '#B45309' },
};

export function orderStatusMeta(status: string): { label: string; color: string } {
  return ORDER_STATUS_META[status] ?? { label: status, color: '#999999' };
}

// Customer-facing labels for the return (RMA) lifecycle.
export const RETURN_STATUS_META: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: 'Requested', color: '#EAB308' },
  APPROVED: { label: 'Approved', color: '#3B82F6' },
  REJECTED: { label: 'Rejected', color: '#DC2626' },
  PICKED_UP: { label: 'Picked Up', color: '#8B5CF6' },
  RECEIVED: { label: 'Received', color: '#8B5CF6' },
  REFUND_INITIATED: { label: 'Refund Initiated', color: '#3B82F6' },
  COMPLETED: { label: 'Completed', color: '#22C55E' },
};

export function returnStatusMeta(status: string): { label: string; color: string } {
  return RETURN_STATUS_META[status] ?? { label: status, color: '#999999' };
}
