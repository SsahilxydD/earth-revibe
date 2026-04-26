import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteProducts, type AdminProduct } from '@/hooks/use-products';

function formatRupees(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function ProductRow({ product }: { product: AdminProduct }) {
  const inStock = product.totalStock > 0;
  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-border bg-white p-4">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {product.name}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="text-xs text-muted">{product.status}</Text>
          <Text className="text-xs text-muted">·</Text>
          <Text className={`text-xs ${inStock ? 'text-success' : 'text-danger'}`}>
            {inStock ? `${product.totalStock} in stock` : 'Out of stock'}
          </Text>
        </View>
      </View>
      <Text className="text-base font-bold text-foreground">{formatRupees(product.price)}</Text>
    </View>
  );
}

export default function ProductsListScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteProducts();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const products = data?.pages.flatMap((p) => p.products) ?? [];
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
        <Text className="text-base text-danger">Failed to load products</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border bg-white px-5 py-4">
        <Text className="text-2xl font-bold text-foreground">Products</Text>
        <Text className="mt-0.5 text-xs text-muted">{total} total</Text>
      </View>
      <FlashList<AdminProduct>
        data={products}
        keyExtractor={(item) => item.id}
        estimatedItemSize={80}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        renderItem={({ item }) => <ProductRow product={item} />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-sm text-muted">No products yet.</Text>
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
