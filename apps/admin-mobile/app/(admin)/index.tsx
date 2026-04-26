import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';

export default function DashboardScreen() {
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

        <View className="rounded-xl border border-border bg-white p-4">
          <Text className="text-sm font-semibold text-foreground">Phase 1 complete</Text>
          <Text className="mt-1 text-sm text-muted">
            Auth + push registration are wired. Phase 2 (orders) lands next.
          </Text>
        </View>

        <Button variant="secondary" onPress={signOut} className="mt-6">
          Sign out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
