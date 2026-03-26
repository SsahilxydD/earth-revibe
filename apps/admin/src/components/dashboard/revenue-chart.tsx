'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api-client';
import { Card, Skeleton } from '@/components/ui';

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => api.get('/admin/analytics/revenue-chart'),
  });

  const chartData = Array.isArray(data) ? data : [];

  return (
    <Card>
      <h3 className="text-base font-semibold text-charcoal mb-4">Revenue Overview</h3>
      {isLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#8E8E8E' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#8E8E8E' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value) => [formatINR(Number(value)), 'Revenue']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2D5016"
                fill="#2D5016"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
