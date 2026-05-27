'use client';

import { forwardRef } from 'react';
import { Spinner } from './spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

// Polaris primary button signature: three-layer inset shadow that gives the
// pressed-bevel look. Lifted directly from admin.shopify.com computed style:
//   0px -1px 0px 1px inset rgba(0,0,0,0.8)
//   0px 0px 0px 1px inset rgb(48,48,48)
//   0px 0.5px 0px 1.5px inset rgba(255,255,255,0.25)
const PRIMARY_SHADOW =
  'shadow-[inset_0px_-1px_0px_1px_rgba(0,0,0,0.8),inset_0px_0px_0px_1px_rgb(48,48,48),inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.25)]';

// Polaris secondary button: subtle border + soft 1px multi-layer shadow.
const SECONDARY_SHADOW = 'shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_0_0_1px_rgba(0,0,0,0.1)]';

const variantStyles = {
  // Primary — dark filled with the Polaris bevel shadow.
  primary: `bg-[#303030] text-white hover:bg-[#1a1a1a] active:bg-[#1a1a1a] ${PRIMARY_SHADOW}`,
  // Secondary — white surface with a 1px hairline border via inset shadow,
  // matching Polaris's "subdued" button.
  secondary: `bg-white text-[#303030] hover:bg-[#f7f7f7] ${SECONDARY_SHADOW}`,
  // Ghost / plain — transparent, no border.
  ghost: 'bg-transparent text-[#616161] hover:bg-[#f1f1f1] hover:text-[#1a1a1a]',
  // Danger — critical action red.
  danger:
    'bg-[#d72c0d] text-white hover:bg-[#b32308] shadow-[inset_0px_-1px_0px_1px_rgba(0,0,0,0.4),inset_0px_0px_0px_1px_rgb(215,44,13),inset_0px_0.5px_0px_1.5px_rgba(255,255,255,0.25)]',
};

// All sizes use the Polaris 6px-vertical / 12px-horizontal padding pattern,
// scaled by height. `text-[13px]` and font-weight 450 (medium) match Inter.
const sizeStyles = {
  sm: 'h-7 px-2.5 text-[12px]',
  md: 'h-8 px-3 text-[13px]',
  lg: 'h-10 px-4 text-[14px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', isLoading, disabled, children, className = '', ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium [transition:background-color_120ms_ease] disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
