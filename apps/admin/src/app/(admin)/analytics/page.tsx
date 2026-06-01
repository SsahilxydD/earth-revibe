'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Headset,
  Globe,
  Store,
  IndianRupee,
  Receipt,
  Wallet,
  PiggyBank,
  Trophy,
} from 'lucide-react';
import { ChartLineIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, Badge, Skeleton, PageHeader, Select } from '@earth-revibe/ui';
import { formatPrice } from '@earth-revibe/shared';
import { StatCard } from '@/components/dashboard/stat-card';
import { ExpenseManager } from '@/components/analytics/expense-manager';
import { useCategories } from '@/hooks/use-categories';
import { isoToLocalDate, todayLocalDate } from '@/lib/order-date';

const AnalyticsCharts = dynamic(() => import('@/components/analytics/analytics-charts'), {
  ssr: false,
});

// Quick presets resolve to a [from, to] pair of local YYYY-MM-DD strings that
// fill the date inputs. Custom dates are then editable directly.
function presetRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const s = new Date();
  if (preset === '7d') s.setDate(now.getDate() - 7);
  else if (preset === '90d') s.setDate(now.getDate() - 90);
  else if (preset === 'mtd') s.setFullYear(now.getFullYear(), now.getMonth(), 1);
  else if (preset === 'ytd') s.setFullYear(now.getFullYear(), 0, 1);
  else s.setDate(now.getDate() - 30);
  return { start: isoToLocalDate(s), end: isoToLocalDate(now) };
}

const PRESETS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'This month', value: 'mtd' },
  { label: 'This year', value: 'ytd' },
];

const channelOptions = [
  { value: 'all', label: 'All channels' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

function pct(n: number) {
  return `${n.toFixed(1)}% margin`;
}

export default function AnalyticsPage() {
  const initial = presetRange('30d');
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [channel, setChannel] = useState('all');
  const [categoryId, setCategoryId] = useState('');

  const { data: catData } = useCategories();
  const categories: any[] = catData?.categories ?? (Array.isArray(catData) ? catData : []);
  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  // Bake local-tz day boundaries into the ISO range the API filters on.
  const startISO = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined;
  const endISO = endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined;

  const queryParams = { startDate: startISO, endDate: endISO, channel, categoryId };
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', queryParams],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (startISO) qs.set('startDate', startISO);
      if (endISO) qs.set('endDate', endISO);
      qs.set('channel', channel);
      if (categoryId) qs.set('categoryId', categoryId);
      return api.get(`/admin/analytics/detailed?${qs.toString()}`);
    },
  });

  const applyPreset = (p: string) => {
    const r = presetRange(p);
    setStartDate(r.start);
    setEndDate(r.end);
  };

  const pnl = data?.pnl;
  const coverage = pnl ? Number(pnl.cogsCoverage ?? 1) : 1;

  return (
    <div className="space-y-3">
      <PageHeader icon={ChartLineIcon} title="Analytics" />

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-medium-gray mb-1">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate || todayLocalDate()}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-medium-gray mb-1">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayLocalDate()}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-medium-gray mb-1">Channel</label>
            <Select
              options={channelOptions}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-medium-gray mb-1">Category</label>
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
          </div>
          <div className="flex gap-0.5 bg-[#f1f1f1] rounded-lg p-0.5 ml-auto">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => applyPreset(p.value)}
                className="px-3 h-7 rounded-md text-[13px] font-medium text-[#616161] hover:text-[#1a1a1a] hover:bg-white/60"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Profit & Loss (delivered orders only) */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-charcoal">Profit &amp; Loss</h2>
        <span className="text-xs text-medium-gray">Realized on delivered orders</span>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load analytics</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-deep-earth hover:underline"
            >
              Retry
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Revenue"
            value={formatPrice(pnl?.revenue || 0)}
            change={`${pnl?.orders || 0} delivered orders`}
            changeType="neutral"
            icon={IndianRupee}
          />
          <StatCard
            title="Cost of goods"
            value={formatPrice(pnl?.cogs || 0)}
            change={
              coverage < 1
                ? `Based on ${(coverage * 100).toFixed(0)}% of items with cost`
                : `${pnl?.units || 0} units`
            }
            changeType={coverage < 1 ? 'negative' : 'neutral'}
            icon={Receipt}
          />
          <StatCard
            title="Gross Profit"
            value={formatPrice(pnl?.grossProfit || 0)}
            change={pct(Number(pnl?.grossMargin || 0))}
            changeType={(pnl?.grossProfit || 0) >= 0 ? 'positive' : 'negative'}
            icon={TrendingUp}
          />
          <StatCard
            title="Operating Expenses"
            value={formatPrice(pnl?.expensesTotal || 0)}
            change="Light bill, logistics, etc."
            changeType="neutral"
            icon={Wallet}
          />
          <StatCard
            title="Net Profit"
            value={formatPrice(pnl?.netProfit || 0)}
            change={pct(Number(pnl?.netMargin || 0))}
            changeType={(pnl?.netProfit || 0) >= 0 ? 'positive' : 'negative'}
            icon={PiggyBank}
          />
        </div>
      )}

      {/* Bestseller + operational stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm text-medium-gray">Bestseller</p>
              {data?.bestSeller ? (
                <>
                  <p className="text-lg font-semibold text-charcoal mt-1 truncate">
                    {data.bestSeller.name}
                  </p>
                  <p className="text-xs text-medium-gray mt-1">
                    {data.bestSeller.quantity} sold · {formatPrice(data.bestSeller.revenue)}
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-charcoal mt-1">—</p>
              )}
            </div>
            <div className="w-10 h-10 bg-off-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Trophy size={20} className="text-deep-earth" />
            </div>
          </div>
        </Card>
        <StatCard
          title="Avg Order Value"
          value={formatPrice(data?.avgOrderValue || 0)}
          change={`${data?.totalOrders || 0} total orders`}
          changeType="neutral"
          icon={ShoppingBag}
        />
        <StatCard
          title="New Customers"
          value={String(
            data?.customerGrowth?.reduce((s: number, c: any) => s + c.count, 0) || 0
          )}
          change="in selected range"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Support Tickets"
          value={String(data?.totalTickets || 0)}
          change={`${data?.openTickets || 0} open`}
          changeType={data?.openTickets > 5 ? 'negative' : 'neutral'}
          icon={Headset}
        />
      </div>

      {/* Sales by channel */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-charcoal">Sales by channel</h3>
          <span className="text-xs text-medium-gray">Excludes cancelled and archived orders</span>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !data?.salesBySource ? (
          <p className="text-sm text-medium-gray">No data yet</p>
        ) : (
          (() => {
            const online = data.salesBySource.online ?? { revenue: 0, orders: 0 };
            const offline = data.salesBySource.offline ?? { revenue: 0, orders: 0 };
            const totalRev = Number(online.revenue) + Number(offline.revenue);
            const onlinePct = totalRev > 0 ? (Number(online.revenue) / totalRev) * 100 : 0;
            const offlinePct = totalRev > 0 ? 100 - onlinePct : 0;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-light-gray">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Globe size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-medium-gray">Online (storefront)</p>
                      <p className="text-xl font-semibold text-charcoal">
                        {formatPrice(online.revenue)}
                      </p>
                      <p className="text-xs text-medium-gray mt-0.5">
                        {online.orders} order{online.orders !== 1 ? 's' : ''} ·{' '}
                        {onlinePct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-light-gray">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Store size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-medium-gray">Offline (manual)</p>
                      <p className="text-xl font-semibold text-charcoal">
                        {formatPrice(offline.revenue)}
                      </p>
                      <p className="text-xs text-medium-gray mt-0.5">
                        {offline.orders} order{offline.orders !== 1 ? 's' : ''} ·{' '}
                        {offlinePct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
                {totalRev > 0 && (
                  <div className="h-2 w-full rounded-full overflow-hidden bg-light-gray flex">
                    <div className="bg-blue-500" style={{ width: `${onlinePct}%` }} />
                    <div className="bg-amber-500" style={{ width: `${offlinePct}%` }} />
                  </div>
                )}
              </div>
            );
          })()
        )}
      </Card>

      {!isLoading && data && <AnalyticsCharts data={data} />}

      <ExpenseManager startISO={startISO} endISO={endISO} />

      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Top Products</h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.topProducts?.length ? (
          <p className="text-medium-gray text-center py-4">No product data yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-gray">
                <th className="text-left py-2 font-medium text-medium-gray">Product</th>
                <th className="text-right py-2 font-medium text-medium-gray">Units Sold</th>
                <th className="text-right py-2 font-medium text-medium-gray">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product: any, i: number) => (
                <tr key={i} className="border-b border-light-gray last:border-0">
                  <td className="py-2 text-charcoal">{product.name}</td>
                  <td className="py-2 text-right text-medium-gray">{product.quantity}</td>
                  <td className="py-2 text-right text-charcoal font-medium">
                    {formatPrice(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Order Status Breakdown</h3>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !data?.ordersByStatus?.length ? (
          <p className="text-medium-gray text-center py-4">No order data yet</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {data.ordersByStatus.map((s: any) => (
              <div key={s.status} className="flex items-center gap-2">
                <Badge
                  variant={
                    s.status === 'DELIVERED'
                      ? 'success'
                      : s.status === 'CANCELLED'
                        ? 'error'
                        : s.status === 'SHIPPING'
                          ? 'warning'
                          : 'default'
                  }
                >
                  {s.status}
                </Badge>
                <span className="text-sm font-medium text-charcoal">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
