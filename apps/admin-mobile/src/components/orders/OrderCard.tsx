import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { AdminOrderListItem } from '@/hooks/use-orders';
import { OrderStatusPill } from './OrderStatusPill';

interface Props {
  order: AdminOrderListItem;
  onPress: () => void;
}

function formatRupees(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function OrderCard({ order, onPress }: Props) {
  const customer = order.user
    ? `${order.user.firstName} ${order.user.lastName}`.trim()
    : (order.guestEmail ?? 'Guest');
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-border bg-white p-4 active:bg-border/30"
    >
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="font-mono text-sm font-semibold text-foreground">
            {order.orderNumber}
          </Text>
          <OrderStatusPill status={order.status} />
        </View>
        <Text className="mt-1 text-sm text-foreground">{customer}</Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-xs text-muted">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} · {relativeTime(order.createdAt)}
          </Text>
          <Text className="text-base font-bold text-foreground">
            {formatRupees(order.totalAmount)}
          </Text>
        </View>
      </View>
      <ChevronRight size={16} color="#a3a3a3" className="ml-2" />
    </Pressable>
  );
}
