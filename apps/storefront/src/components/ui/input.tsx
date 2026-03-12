import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, wrapperClassName, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("w-full", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[var(--button-radius)] border bg-white px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors duration-200",
            "placeholder:text-[var(--color-muted)]",
            "focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]",
            "disabled:cursor-not-allowed disabled:bg-[var(--color-surface)] disabled:opacity-60",
            error
              ? "border-[var(--color-sale)]"
              : "border-[var(--color-border)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--color-sale)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
