'use client';

import { CalendarDays, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

export function FilterBar({ period, onPeriodChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Date range dropdown */}
      <div className="relative">
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="appearance-none bg-white border border-light-gray rounded-lg pl-8 pr-8 py-1.5 text-sm text-charcoal font-medium cursor-pointer hover:bg-off-white transition-colors outline-none focus:border-deep-earth"
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <CalendarDays
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-medium-gray pointer-events-none"
        />
        <ChevronDown
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-medium-gray pointer-events-none"
        />
      </div>

      {/* Channel selector */}
      <div className="relative">
        <select className="appearance-none bg-white border border-light-gray rounded-lg px-3 pr-7 py-1.5 text-sm text-charcoal font-medium cursor-pointer hover:bg-off-white transition-colors outline-none focus:border-deep-earth">
          <option>All channels</option>
          <option>Online Store</option>
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-medium-gray pointer-events-none"
        />
      </div>

      {/* Live visitor indicator */}
      <div className="flex items-center gap-1.5 bg-white border border-light-gray rounded-lg px-3 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-sm text-charcoal font-medium">0 live visitors</span>
      </div>
    </div>
  );
}
