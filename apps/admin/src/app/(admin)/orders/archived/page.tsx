'use client';

import { OrdersView } from '@/components/orders/orders-view';

// Archived (soft-deleted) orders — restorable. The shared view sends
// view=archived to the API, which filters to deletedAt != null.
export default function ArchivedOrdersPage() {
  return <OrdersView view="archived" />;
}
