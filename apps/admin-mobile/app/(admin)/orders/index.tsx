import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteOrders, type AdminOrderListItem } from '@/hooks/use-orders';
import { OrderCard } from '@/components/orders/OrderCard';

export default function OrdersListScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteOrders();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const orders = data?.pages.flatMap((p) => p.orders) ?? [];
  const total = data?.pages[0]?.total ?? 0;

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
        <Text className="text-base text-danger">
          {(error as Error)?.message ?? 'Failed to load'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border bg-white px-5 py-4">
        <Text className="text-2xl font-bold text-foreground">Orders</Text>
        <Text className="mt-0.5 text-xs text-muted">{total} total · pull to refresh</Text>
      </View>

      <FlashList<AdminOrderListItem>
        data={orders}
        keyExtractor={(item) => item.id}
        estimatedItemSize={108}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => router.push(`/orders/${item.orderNumber}`)} />
        )}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-muted">No orders yet.</Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
