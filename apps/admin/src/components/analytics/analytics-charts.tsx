'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@earth-revibe/ui';

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

interface AnalyticsChartsProps {
  data: {
    revenueByDay: { date: string; revenue: number }[];
    customerGrowth: { month: string; count: number }[];
  };
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Revenue Trend</h3>
        <div className="h-[280px]">
          {data.revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.revenueByDay}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8E8E8E' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  }
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8E8E8E' }}
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
          ) : (
            <p className="text-medium-gray text-center pt-20">No revenue data yet</p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Customer Growth</h3>
        <div className="h-[280px]">
          {data.customerGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.customerGrowth}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#8E8E8E' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12, fill: '#8E8E8E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5' }} />
                <Bar dataKey="count" fill="#3D2B1F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-medium-gray text-center pt-20">No customer data yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
