'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendPoint {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
}

// Time-series area chart for the GA report. Three series share one axis so
// admins can eyeball traffic shape at a glance; colors mirror the deep-earth
// palette already used by the analytics charts.
export function GaTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gaUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D5016" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2D5016" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gaSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3D2B1F" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#3D2B1F" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gaViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8E8E8E" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#8E8E8E" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={44}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
          />
          <Tooltip
            labelFormatter={(v) =>
              new Date(v).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            }
            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            name="Active users"
            dataKey="activeUsers"
            stroke="#2D5016"
            fill="url(#gaUsers)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            name="Sessions"
            dataKey="sessions"
            stroke="#3D2B1F"
            fill="url(#gaSessions)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            name="Page views"
            dataKey="pageViews"
            stroke="#8E8E8E"
            fill="url(#gaViews)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
