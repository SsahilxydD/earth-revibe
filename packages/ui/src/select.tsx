'use client';

import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

// Polaris select: same shape as Input — h-8, 8px radius, hairline inset border,
// blue focus ring. Chevron baked in as a background image (gray #616161).
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-[#303030]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-8 pl-3 pr-9 rounded-lg bg-white text-[13px] text-[#303030] outline-none transition-shadow appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%23616161%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat ${
            error
              ? 'shadow-[inset_0_0_0_1px_#d72c0d] focus:shadow-[inset_0_0_0_1px_#d72c0d,0_0_0_2px_rgba(215,44,13,0.2)]'
              : 'shadow-[inset_0_0_0_1px_#ebebeb] focus:shadow-[inset_0_0_0_1px_#005bd3,0_0_0_2px_rgba(0,91,211,0.2)]'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[12px] text-[#d72c0d]">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
