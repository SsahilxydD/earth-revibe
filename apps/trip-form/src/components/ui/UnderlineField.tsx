import { useRef, useEffect } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Label shown above the field in small caps. */
  label: string;
  /** Accent tone for the underline + caret. */
  tone?: 'ink' | 'clay';
  /** Override input mode for numeric fields (Age). */
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  maxLength?: number;
  /** Optional prefix like "@" for the Instagram field. */
  prefix?: string;
  autoFocus?: boolean;
};

export function UnderlineField({
  value,
  onChange,
  placeholder,
  label,
  tone = 'ink',
  inputMode,
  autoComplete,
  maxLength,
  prefix,
  autoFocus,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const underline = tone === 'clay' ? 'border-clay' : 'border-ink';
  const caretClass = 'caret-clay';
  const labelColor = tone === 'clay' ? 'text-clay' : 'text-dim';

  return (
    <label className="flex flex-col gap-2">
      <span className={`font-sans text-[9px] font-bold tracking-[0.18em] ${labelColor}`}>
        {label}
      </span>
      <span className={`flex h-14 items-end gap-[6px] border-b-[1.5px] pb-[14px] ${underline}`}>
        {prefix ? (
          <span className="font-display text-[22px] font-light text-dim">{prefix}</span>
        ) : null}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) =>
            onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)
          }
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent font-display text-[28px] font-light tracking-[-0.02em] text-ink ${caretClass} placeholder:text-dim placeholder:font-light outline-none`}
        />
      </span>
    </label>
  );
}
