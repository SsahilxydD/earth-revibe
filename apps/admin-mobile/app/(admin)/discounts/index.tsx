import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useDiscounts, useToggleDiscountActive, type AdminDiscount } from '@/hooks/use-discounts';

function formatValue(d: AdminDiscount): string {
  const n = typeof d.value === 'string' ? Number(d.value) : d.value;
  if (d.type === 'PERCENTAGE') return `${n}%`;
  if (d.type === 'FLAT') return `₹${n}`;
  if (d.type === 'FREE_SHIPPING') return 'Free shipping';
  return `${n}`;
}

function DiscountRow({ discount }: { discount: AdminDiscount }) {
  const toggle = useToggleDiscountActive();
  const expired = new Date(discount.expiresAt).getTime() < Date.now();

  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-border bg-white p-4">
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-mono text-sm font-bold text-foreground">{discount.code}</Text>
          {expired ? (
            <View className="rounded-full bg-danger/10 px-2 py-0.5">
              <Text className="text-[10px] font-semibold uppercase text-danger">expired</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-1 text-xs text-muted">
          {formatValue(discount)} · used {discount.usageCount}
          {discount.usageLimit ? `/${discount.usageLimit}` : ''}
        </Text>
      </View>
      <Switch
        value={discount.isActive}
        disabled={toggle.isPending}
        onValueChange={(next) => {
          toggle.mutate(
            { id: discount.id, isActive: next },
            {
              onError: (err) => Alert.alert('Update failed', (err as Error).message),
            }
          );
        }}
        trackColor={{ false: '#e5e5e5', true: '#0a0a0a' }}
      />
    </View>
  );
}

export default function DiscountsListScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, refetch } = useDiscounts();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-base text-danger">Failed to load discounts</Text>
      </SafeAreaView>
    );
  }

  const discounts = data?.discounts ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border bg-white px-5 py-4">
        <Text className="text-2xl font-bold text-foreground">Discounts</Text>
        <Text className="mt-0.5 text-xs text-muted">
          {discounts.length} total · toggle to enable/disable
        </Text>
      </View>
      <FlashList<AdminDiscount>
        data={discounts}
        keyExtractor={(item) => item.id}
        estimatedItemSize={80}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <DiscountRow discount={item} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-muted">No discount codes yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
