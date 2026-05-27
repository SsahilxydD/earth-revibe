'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// Polaris input: white surface, hairline border via inset shadow, 8px radius,
// focus ring uses Shopify blue #005bd3.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[#303030]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-8 px-3 rounded-lg bg-white text-[13px] text-[#303030] placeholder:text-[#8a8a8a] outline-none transition-shadow ${
            error
              ? 'shadow-[inset_0_0_0_1px_#d72c0d] focus:shadow-[inset_0_0_0_1px_#d72c0d,0_0_0_2px_rgba(215,44,13,0.2)]'
              : 'shadow-[inset_0_0_0_1px_#ebebeb] focus:shadow-[inset_0_0_0_1px_#005bd3,0_0_0_2px_rgba(0,91,211,0.2)]'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-[12px] text-[#d72c0d]">{error}</p>}
        {helperText && !error && <p className="text-[12px] text-[#616161]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
