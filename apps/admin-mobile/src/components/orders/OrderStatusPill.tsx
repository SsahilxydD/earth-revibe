import { Text, View } from 'react-native';
import type { OrderStatus } from '@earth-revibe/shared';

const styles: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  PLACED: { bg: 'bg-warning/10', text: 'text-warning', label: 'Placed' },
  CONFIRMED: { bg: 'bg-success/10', text: 'text-success', label: 'Confirmed' },
  PROCESSING: { bg: 'bg-warning/10', text: 'text-warning', label: 'Processing' },
  SHIPPED: { bg: 'bg-primary/10', text: 'text-primary', label: 'Shipped' },
  OUT_FOR_DELIVERY: { bg: 'bg-primary/10', text: 'text-primary', label: 'Out for delivery' },
  DELIVERED: { bg: 'bg-success/10', text: 'text-success', label: 'Delivered' },
  CANCELLED: { bg: 'bg-danger/10', text: 'text-danger', label: 'Cancelled' },
  RETURNED: { bg: 'bg-warning/10', text: 'text-warning', label: 'Returned' },
  REFUNDED: { bg: 'bg-muted/20', text: 'text-muted', label: 'Refunded' },
};

interface Props {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export function OrderStatusPill({ status, size = 'sm' }: Props) {
  const s = styles[status];
  return (
    <View
      className={`self-start rounded-full ${s.bg} ${size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'}`}
    >
      <Text
        className={`${s.text} ${
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        } font-semibold uppercase tracking-wider`}
      >
        {s.label}
      </Text>
    </View>
  );
}
