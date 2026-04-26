import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, className, ...rest },
  ref
) {
  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#a3a3a3"
        className={`h-12 rounded-xl border ${
          error ? 'border-danger' : 'border-border'
        } bg-white px-4 text-base text-foreground ${className ?? ''}`}
        {...rest}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
});
