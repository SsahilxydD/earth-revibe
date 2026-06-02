import { Text, View } from 'react-native';
import type { OrderStatus } from '@earth-revibe/shared';

const styles: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-muted/10', text: 'text-muted', label: 'Draft' },
  PENDING: { bg: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
  CONFIRMED: { bg: 'bg-success/10', text: 'text-success', label: 'Confirmed' },
  SHIPPING: { bg: 'bg-primary/10', text: 'text-primary', label: 'Shipping' },
  DELIVERED: { bg: 'bg-success/10', text: 'text-success', label: 'Delivered' },
  CANCELLED: { bg: 'bg-danger/10', text: 'text-danger', label: 'Cancelled' },
  RETURNED: { bg: 'bg-warning/10', text: 'text-warning', label: 'Returned' },
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
