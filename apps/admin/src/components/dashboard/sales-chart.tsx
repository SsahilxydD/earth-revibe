"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, Skeleton } from "@/components/ui";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

interface SalesChartProps {
  data: { date: string; revenue: number }[];
  isLoading: boolean;
}

export function SalesChart({ data, isLoading }: SalesChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  }));

  return (
    <Card padding={false}>
      <div className="px-5 py-4 border-b border-light-gray">
        <h3 className="text-sm font-semibold text-charcoal">Total sales</h3>
      </div>
      <div className="p-5">
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-medium-gray">
            No sales data for this period
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2D5016" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#2D5016" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#8E8E8E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8E8E8E" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                  width={45}
                />
                <Tooltip
                  formatter={(value) => [formatINR(Number(value)), "Sales"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E5E5",
                    fontSize: 13,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2D5016"
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
