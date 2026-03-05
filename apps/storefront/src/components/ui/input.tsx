"use client";

import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-4 py-3 h-11 rounded-lg border-[1.5px] bg-white text-charcoal placeholder:text-medium-gray transition-colors duration-150 outline-none ${
            error
              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
              : "border-light-gray focus:border-forest-green focus:ring-2 focus:ring-forest-green/20"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {helperText && !error && <p className="text-sm text-medium-gray">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
