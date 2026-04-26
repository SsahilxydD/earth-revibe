import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Package, ShoppingBag, Tag, Users } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';

type IconComponent = typeof ShoppingBag;

function NavCard({
  icon: Icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconComponent;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-border bg-white p-4 active:bg-border/30"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon size={18} color="#0a0a0a" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-xs text-muted">{subtitle}</Text>
      </View>
      <ChevronRight size={16} color="#a3a3a3" />
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="mb-8">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
            Signed in as
          </Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-sm text-muted">{user?.email}</Text>
        </View>

        <NavCard
          icon={ShoppingBag}
          title="Orders"
          subtitle="View, update, fulfill"
          onPress={() => router.push('/orders')}
        />
        <NavCard
          icon={Package}
          title="Products"
          subtitle="Inventory and pricing"
          onPress={() => router.push('/products')}
        />
        <NavCard
          icon={Users}
          title="Customers"
          subtitle="Accounts and loyalty"
          onPress={() => router.push('/customers')}
        />
        <NavCard
          icon={Tag}
          title="Discounts"
          subtitle="Promo codes"
          onPress={() => router.push('/discounts')}
        />

        <Button variant="secondary" onPress={signOut} className="mt-6">
          Sign out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
