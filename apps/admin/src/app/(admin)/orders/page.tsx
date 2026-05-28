'use client';

import { OrdersView } from '@/components/orders/orders-view';

// Active orders (non-archived). Archived orders live at /orders/archived.
export default function OrdersPage() {
  return <OrdersView view="active" />;
}
