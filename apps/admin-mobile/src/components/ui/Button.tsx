import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';

const ButtonPressable = cssInterop(Pressable, { className: 'style' });

interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: React.ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary active:bg-primary/90', text: 'text-white' },
  secondary: {
    bg: 'bg-white border border-border active:bg-border/30',
    text: 'text-foreground',
  },
  ghost: { bg: 'active:bg-border/30', text: 'text-foreground' },
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-12 px-6',
};

export function Button({
  children,
  loading,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const { bg, text } = variantStyles[variant];
  const isDisabled = disabled || loading;
  return (
    <ButtonPressable
      {...rest}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-xl ${bg} ${sizeStyles[size]} ${
        isDisabled ? 'opacity-60' : ''
      } ${className ?? ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#0a0a0a'} />
      ) : (
        <Text className={`text-base font-semibold ${text}`}>{children}</Text>
      )}
    </ButtonPressable>
  );
}
