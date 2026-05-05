'use client';

import { Card } from '@earth-revibe/ui';

interface StatusData {
  status: string;
  count: number;
}

const statusColors: Record<string, string> = {
  PENDING: '#F59E0B',
  PROCESSING: '#3B82F6',
  SHIPPED: '#8B5CF6',
  DELIVERED: '#22C55E',
  CANCELLED: '#EF4444',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function OrdersByStatus({ data }: { data: StatusData[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card padding={false}>
      <div className="px-5 py-4 border-b border-light-gray">
        <h3 className="text-sm font-semibold text-charcoal">Orders by status</h3>
      </div>
      {data.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-medium-gray">
          No orders for this period
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden bg-off-white">
            {data.map((d) => (
              <div
                key={d.status}
                className="h-full transition-all"
                style={{
                  width: `${(d.count / total) * 100}%`,
                  backgroundColor: statusColors[d.status] || '#9CA3AF',
                }}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="space-y-2">
            {data.map((d) => (
              <div key={d.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: statusColors[d.status] || '#9CA3AF' }}
                  />
                  <span className="text-sm text-dark-gray">
                    {statusLabels[d.status] || d.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-charcoal">{d.count}</span>
                  <span className="text-xs text-medium-gray w-10 text-right">
                    {total > 0 ? ((d.count / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Total */}
          <div className="pt-3 border-t border-light-gray flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal">Total</span>
            <span className="text-sm font-semibold text-charcoal">{total}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
