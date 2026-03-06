"use client";

const periods = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

interface PeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1 bg-off-white rounded-lg p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === p.value
              ? "bg-white text-charcoal shadow-sm"
              : "text-medium-gray hover:text-dark-gray"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
