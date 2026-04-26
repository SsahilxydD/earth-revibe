import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginSchema } from '@earth-revibe/shared';

// Smoke-test import of a real shared schema to confirm
// the workspace + Metro resolution is wired correctly.
const sampleShape = Object.keys(loginSchema.shape).join(', ');

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-3xl font-bold text-foreground">Earth Revibe Admin</Text>
        <Text className="mt-2 text-base text-muted">Mobile scaffold ready</Text>
        <View className="mt-8 rounded-xl border border-border bg-white px-4 py-3">
          <Text className="text-xs uppercase tracking-widest text-muted">shared schema OK</Text>
          <Text className="mt-1 text-sm text-foreground">loginSchema.shape: {sampleShape}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
