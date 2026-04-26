import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Package, User } from 'lucide-react-native';
import { useOrder, useUpdateOrderStatus, VALID_TRANSITIONS } from '@/hooks/use-orders';
import { OrderStatusPill } from '@/components/orders/OrderStatusPill';
import { StatusUpdateSheet } from '@/components/orders/StatusUpdateSheet';
import { Button } from '@/components/ui/Button';
import type { OrderStatus } from '@earth-revibe/shared';

function formatRupees(amount: string | number | undefined | null): string {
  if (amount === null || amount === undefined) return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { data: order, isLoading, isError } = useOrder(orderNumber);
  const updateStatus = useUpdateOrderStatus();
  const [sheetOpen, setSheetOpen] = useState(false);

  const onSelectStatus = (next: OrderStatus) => {
    if (!order) return;
    updateStatus.mutate(
      { orderNumber: order.orderNumber, status: next },
      {
        onSuccess: () => setSheetOpen(false),
        onError: (err) => {
          Alert.alert('Status update failed', (err as Error).message);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-base text-danger">Order not found</Text>
      </SafeAreaView>
    );
  }

  const transitions = VALID_TRANSITIONS[order.status] ?? [];
  const customerName = order.user
    ? `${order.user.firstName} ${order.user.lastName}`.trim()
    : (order.guestEmail ?? 'Guest');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-border bg-white px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-border/40"
        >
          <ArrowLeft size={20} color="#0a0a0a" />
        </Pressable>
        <View className="flex-1">
          <Text className="font-mono text-base font-semibold text-foreground">
            {order.orderNumber}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <OrderStatusPill status={order.status} />
            <Text className="text-xs text-muted">
              {new Date(order.createdAt).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Customer */}
        <View className="mb-3 rounded-2xl border border-border bg-white p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <User size={14} color="#737373" />
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted">
              Customer
            </Text>
          </View>
          <Text className="text-base font-semibold text-foreground">{customerName}</Text>
          {order.user?.email ? (
            <Text className="text-sm text-muted">{order.user.email}</Text>
          ) : null}
          {order.user?.phone ? (
            <Text className="text-sm text-muted">{order.user.phone}</Text>
          ) : null}
        </View>

        {/* Address */}
        {order.address ? (
          <View className="mb-3 rounded-2xl border border-border bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <MapPin size={14} color="#737373" />
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted">
                Shipping address
              </Text>
            </View>
            <Text className="text-sm text-foreground">{order.address.fullName}</Text>
            <Text className="text-sm text-muted">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ''}
            </Text>
            <Text className="text-sm text-muted">
              {order.address.city}, {order.address.state} — {order.address.pinCode}
            </Text>
            <Text className="mt-1 text-sm text-muted">{order.address.phone}</Text>
          </View>
        ) : null}

        {/* Items */}
        <View className="mb-3 rounded-2xl border border-border bg-white p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Package size={14} color="#737373" />
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted">Items</Text>
          </View>
          {order.items.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center justify-between border-b border-border/40 py-2.5"
            >
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text className="text-xs text-muted">
                  {item.variantSize} · {item.variantColor} · ×{item.quantity}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-foreground">
                {formatRupees(item.totalPrice)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="mb-3 rounded-2xl border border-border bg-white p-4">
          <Row label="Subtotal" value={formatRupees(order.subtotal)} />
          {Number(order.discountAmount) > 0 ? (
            <Row label="Discount" value={`- ${formatRupees(order.discountAmount)}`} success />
          ) : null}
          <Row label="Shipping" value={formatRupees(order.shippingAmount)} />
          {Number(order.taxAmount) > 0 ? (
            <Row label="Tax" value={formatRupees(order.taxAmount)} />
          ) : null}
          <View className="mt-2 border-t border-border pt-2">
            <Row label="Total" value={formatRupees(order.totalAmount)} bold />
          </View>
          {order.payment ? (
            <Text className="mt-2 text-xs text-muted">
              {order.payment.method ?? 'Unknown'} · {order.payment.status}
            </Text>
          ) : null}
        </View>

        {/* Status history */}
        {order.statusHistory && order.statusHistory.length > 0 ? (
          <View className="mb-3 rounded-2xl border border-border bg-white p-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              History
            </Text>
            {order.statusHistory.map((entry) => (
              <View key={entry.id} className="flex-row items-start gap-3 py-2">
                <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {entry.status.replace(/_/g, ' ')}
                  </Text>
                  {entry.note ? <Text className="text-xs text-muted">{entry.note}</Text> : null}
                  <Text className="text-xs text-muted">
                    {new Date(entry.createdAt).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {transitions.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-white px-5 pb-6 pt-3">
          <Button onPress={() => setSheetOpen(true)} loading={updateStatus.isPending}>
            Update status
          </Button>
        </View>
      ) : null}

      <StatusUpdateSheet
        visible={sheetOpen}
        currentStatus={order.status}
        allowedTransitions={transitions}
        onSelect={onSelectStatus}
        onClose={() => setSheetOpen(false)}
        isUpdating={updateStatus.isPending}
      />
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  bold,
  success,
}: {
  label: string;
  value: string;
  bold?: boolean;
  success?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={`text-sm ${bold ? 'font-bold text-foreground' : 'text-muted'}`}>
        {label}
      </Text>
      <Text
        className={`text-sm ${
          bold
            ? 'text-base font-bold text-foreground'
            : success
              ? 'text-success'
              : 'text-foreground'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
