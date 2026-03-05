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
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 h-9 rounded-lg border bg-white text-charcoal text-sm placeholder:text-medium-gray transition-colors duration-150 outline-none ${
            error
              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
              : "border-light-gray focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {helperText && !error && <p className="text-xs text-medium-gray">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
