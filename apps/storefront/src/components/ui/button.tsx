"use client";

import { forwardRef } from "react";
import { Spinner } from "./spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  primary: "bg-forest-green text-white hover:bg-forest-green/90 active:bg-forest-green/80",
  secondary: "border-[1.5px] border-forest-green text-forest-green hover:bg-forest-green hover:text-white",
  ghost: "text-forest-green hover:bg-cream",
  danger: "bg-error text-white hover:bg-error/90",
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm h-9",
  md: "px-6 py-3 text-base h-11",
  lg: "px-8 py-4 text-lg h-[52px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, disabled, children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
