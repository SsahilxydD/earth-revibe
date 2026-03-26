'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
}

const changeStyles = {
  positive: 'text-success',
  negative: 'text-error',
  neutral: 'text-medium-gray',
};

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
}: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-medium-gray">{title}</p>
          <p className="text-2xl font-semibold text-charcoal mt-1">{value}</p>
          {change && <p className={`text-xs mt-1 ${changeStyles[changeType]}`}>{change}</p>}
        </div>
        <div className="w-10 h-10 bg-off-white rounded-lg flex items-center justify-center">
          <Icon size={20} className="text-deep-earth" />
        </div>
      </div>
    </Card>
  );
}
