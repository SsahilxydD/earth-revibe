'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Datum {
  label: string;
  value: number;
}

// Deep-earth-leaning categorical palette reused across the donuts.
const PALETTE = ['#2D5016', '#3D2B1F', '#8E8E8E', '#6B8E23', '#A0522D', '#C2B280', '#556B2F'];

// Horizontal bar chart for a label/value breakdown (channels, sessions, etc.).
// Horizontal keeps long labels readable without rotation.
export function GaBarChart({ data, height = 240 }: { data: Datum[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#8E8E8E' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 11, fill: '#8E8E8E' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f7f7f7' }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5' }}
          />
          <Bar dataKey="value" fill="#2D5016" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Donut for share-of-total breakdowns (devices, new vs returning).
export function GaDonutChart({ data, height = 240 }: { data: Datum[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={entry.label} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E5E5' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
