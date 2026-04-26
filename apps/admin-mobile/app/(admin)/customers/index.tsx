import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteCustomers, type AdminCustomer } from '@/hooks/use-customers';

function CustomerRow({ customer }: { customer: AdminCustomer }) {
  const fullName = `${customer.firstName} ${customer.lastName}`.trim() || customer.email;
  const orderCount = customer._count?.orders ?? 0;
  return (
    <View className="mb-3 rounded-2xl border border-border bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 pr-3 text-sm font-semibold text-foreground" numberOfLines={1}>
          {fullName}
        </Text>
        {!customer.isActive ? (
          <View className="rounded-full bg-danger/10 px-2 py-0.5">
            <Text className="text-[10px] font-semibold uppercase text-danger">inactive</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
        {customer.email}
      </Text>
      {customer.phone ? <Text className="text-xs text-muted">{customer.phone}</Text> : null}
      <View className="mt-2 flex-row items-center gap-3">
        <Text className="text-xs text-muted">
          {orderCount} {orderCount === 1 ? 'order' : 'orders'}
        </Text>
        <Text className="text-xs text-muted">·</Text>
        <Text className="text-xs text-muted">{customer.loyaltyPoints} pts</Text>
      </View>
    </View>
  );
}

export default function CustomersListScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteCustomers();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const customers = data?.pages.flatMap((p) => p.customers) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;

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
        <Text className="text-base text-danger">Failed to load customers</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border bg-white px-5 py-4">
        <Text className="text-2xl font-bold text-foreground">Customers</Text>
        <Text className="mt-0.5 text-xs text-muted">{total} total</Text>
      </View>
      <FlashList<AdminCustomer>
        data={customers}
        keyExtractor={(item) => item.id}
        estimatedItemSize={108}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        renderItem={({ item }) => <CustomerRow customer={item} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-muted">No customers yet.</Text>
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
