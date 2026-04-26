import { Modal, Pressable, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { OrderStatus } from '@earth-revibe/shared';
import { OrderStatusPill } from './OrderStatusPill';

interface Props {
  visible: boolean;
  currentStatus: OrderStatus;
  allowedTransitions: OrderStatus[];
  onSelect: (status: OrderStatus) => void;
  onClose: () => void;
  isUpdating?: boolean;
}

export function StatusUpdateSheet({
  visible,
  currentStatus,
  allowedTransitions,
  onSelect,
  onClose,
  isUpdating,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable className="flex-1 items-center justify-end bg-black/50" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full rounded-t-3xl bg-background p-5"
          style={{ paddingBottom: 32 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-foreground">Update status</Text>
              <View className="mt-1 flex-row items-center gap-2">
                <Text className="text-xs text-muted">Currently</Text>
                <OrderStatusPill status={currentStatus} />
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-border/40"
            >
              <X size={18} color="#0a0a0a" />
            </Pressable>
          </View>

          {allowedTransitions.length === 0 ? (
            <View className="rounded-xl bg-border/30 p-4">
              <Text className="text-sm text-muted">No transitions allowed from this state.</Text>
            </View>
          ) : (
            allowedTransitions.map((target) => (
              <Pressable
                key={target}
                disabled={isUpdating}
                onPress={() => onSelect(target)}
                className="mb-2 flex-row items-center justify-between rounded-xl border border-border bg-white p-4 active:bg-border/30"
              >
                <OrderStatusPill status={target} size="md" />
                <Check size={18} color="#0a0a0a" />
              </Pressable>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
