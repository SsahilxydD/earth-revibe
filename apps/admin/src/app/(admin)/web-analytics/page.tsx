'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Users,
  UserPlus,
  Activity,
  Eye,
  Timer,
  Zap,
  Target,
  TrendingDown,
  Repeat,
  IndianRupee,
  Receipt,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';
import { GlobeIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, Skeleton, PageHeader } from '@earth-revibe/ui';
import { StatCard } from '@/components/dashboard/stat-card';

// Recharts pulls in a lot of client-only code; load it lazily (no SSR) to match
// how the main Analytics page imports its charts.
const GaTrendChart = dynamic(
  () => import('@/components/web-analytics/ga-trend-chart').then((m) => m.GaTrendChart),
  { ssr: false }
);
const GaBarChart = dynamic(
  () => import('@/components/web-analytics/ga-breakdown-charts').then((m) => m.GaBarChart),
  { ssr: false }
);
const GaDonutChart = dynamic(
  () => import('@/components/web-analytics/ga-breakdown-charts').then((m) => m.GaDonutChart),
  { ssr: false }
);

// ---------- types (mirror the GA backend response data shapes) ----------

interface LabelValue {
  label: string;
  value: number;
}

interface GaStatus {
  configured: boolean;
  hasCredentials: boolean;
  credentialSource: string | null;
  serviceAccountEmail: string | null;
  propertyId: string | null;
  hint: string | null;
}

interface GaLive {
  configured: boolean;
  activeUsers: number;
  byCountry: LabelValue[];
  byPage: LabelValue[];
  byDevice: LabelValue[];
}

interface GaReport {
  configured: boolean;
  hint?: string | null;
  range: { startDate: string; endDate: string };
  totals?: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number;
    bounceRate: number;
    engagementRate: number;
    eventCount: number;
    conversions: number;
  };
  ecommerce?: {
    totalRevenue: number;
    transactions: number;
    ecommercePurchases: number;
    cartToViewRate: number;
  };
  timeseries?: { date: string; activeUsers: number; sessions: number; pageViews: number }[];
  channels?: LabelValue[];
  sources?: { source: string; medium: string; sessions: number; users: number }[];
  pages?: LabelValue[];
  landingPages?: LabelValue[];
  devices?: LabelValue[];
  countries?: LabelValue[];
  cities?: LabelValue[];
  browsers?: LabelValue[];
  events?: LabelValue[];
  newVsReturning?: LabelValue[];
  topItems?: { name: string; views: number; revenue: number }[];
}

// ---------- formatters ----------

const numberFmt = new Intl.NumberFormat('en-IN');
const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function fmtCount(n: number | undefined | null) {
  return numberFmt.format(Math.round(Number(n) || 0));
}
function fmtInr(n: number | undefined | null) {
  return inrFmt.format(Number(n) || 0);
}
function fmtPct(rate: number | undefined | null) {
  // Backend rates are 0..1.
  return `${((Number(rate) || 0) * 100).toFixed(1)}%`;
}
function fmtDuration(seconds: number | undefined | null) {
  const total = Math.round(Number(seconds) || 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s}s`;
}

// Local YYYY-MM-DD for a date `days` before today (today inclusive of range end).
function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const RANGE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 28 days', days: 28 },
  { label: 'Last 90 days', days: 90 },
];

// ---------- small presentational helpers ----------

function MiniList({
  title,
  items,
  fmt = fmtCount,
}: {
  title: string;
  items: LabelValue[] | undefined;
  fmt?: (n: number) => string;
}) {
  const rows = (items ?? []).slice(0, 5);
  return (
    <div>
      <p className="text-xs font-medium text-medium-gray uppercase tracking-wide mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-medium-gray">—</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-charcoal truncate">{r.label || '(not set)'}</span>
              <span className="text-medium-gray font-medium tabular-nums flex-shrink-0">
                {fmt(r.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Simple two-column breakdown table (label + single numeric value).
function BreakdownTable({
  data,
  labelHead,
  valueHead,
  fmt = fmtCount,
  emptyText = 'No data for this range',
}: {
  data: LabelValue[] | undefined;
  labelHead: string;
  valueHead: string;
  fmt?: (n: number) => string;
  emptyText?: string;
}) {
  const rows = data ?? [];
  if (rows.length === 0) return <p className="text-medium-gray text-center py-4">{emptyText}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-light-gray">
          <th className="text-left py-2 font-medium text-medium-gray">{labelHead}</th>
          <th className="text-right py-2 font-medium text-medium-gray">{valueHead}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.label}-${i}`} className="border-b border-light-gray last:border-0">
            <td className="py-2 text-charcoal truncate max-w-0 w-full">{r.label || '(not set)'}</td>
            <td className="py-2 text-right text-charcoal font-medium tabular-nums whitespace-nowrap">
              {fmt(r.value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-charcoal px-1 pt-1">{children}</h2>;
}

// ---------- page ----------

export default function WebAnalyticsPage() {
  const [rangeDays, setRangeDays] = useState(28);
  // GA reports use whole-day boundaries; start is `days` ago, end is today.
  const start = isoDaysAgo(rangeDays);
  const end = todayIso();

  const { data: status } = useQuery<GaStatus>({
    queryKey: ['ga-status'],
    queryFn: () => api.get('/admin/analytics/ga/status'),
  });

  const { data: live, isLoading: liveLoading } = useQuery<GaLive>({
    queryKey: ['ga-live'],
    queryFn: () => api.get('/admin/analytics/ga/live'),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
  } = useQuery<GaReport>({
    queryKey: ['ga-report', start, end],
    queryFn: () => api.get(`/admin/analytics/ga/report?start=${start}&end=${end}`),
  });

  const notConfigured = status?.configured === false || report?.configured === false;
  const hint = report?.hint ?? status?.hint ?? null;
  const serviceAccountEmail = status?.serviceAccountEmail ?? null;

  const totals = report?.totals;
  const ecom = report?.ecommerce;
  const liveCount = live?.configured ? live.activeUsers : 0;

  const kpis = totals
    ? [
        { title: 'Active Users', value: fmtCount(totals.activeUsers), icon: Users },
        { title: 'New Users', value: fmtCount(totals.newUsers), icon: UserPlus },
        { title: 'Sessions', value: fmtCount(totals.sessions), icon: Activity },
        { title: 'Page Views', value: fmtCount(totals.screenPageViews), icon: Eye },
        {
          title: 'Avg. Session Duration',
          value: fmtDuration(totals.averageSessionDuration),
          icon: Timer,
        },
        { title: 'Engagement Rate', value: fmtPct(totals.engagementRate), icon: Zap },
        { title: 'Bounce Rate', value: fmtPct(totals.bounceRate), icon: TrendingDown },
        { title: 'Events', value: fmtCount(totals.eventCount), icon: Target },
        { title: 'Conversions', value: fmtCount(totals.conversions), icon: Repeat },
      ]
    : [];

  return (
    <div className="space-y-3">
      <PageHeader
        icon={GlobeIcon}
        title="Website Analytics"
        subtitle="Live data from Google Analytics"
      />

      {/* Date range presets */}
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-medium-gray">
            {start} &rarr; {end}
          </p>
          <div className="flex gap-0.5 bg-[#f1f1f1] rounded-lg p-0.5">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => setRangeDays(p.days)}
                className={`px-3 h-7 rounded-md text-[13px] font-medium transition-colors ${
                  rangeDays === p.days
                    ? 'bg-white text-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
                    : 'text-[#616161] hover:text-[#1a1a1a] hover:bg-white/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Setup banner — shown when GA isn't configured */}
      {notConfigured && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Google Analytics is not connected
            </p>
            <p className="text-sm text-amber-800 mt-1">
              {hint || 'Add GA4 service-account credentials and a property ID to see live data.'}
            </p>
            {serviceAccountEmail && (
              <p className="text-xs text-amber-800 mt-2">
                Grant this service account Viewer access on your GA4 property:{' '}
                <span className="font-mono font-medium break-all">{serviceAccountEmail}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* "Right now" live panel */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex items-center gap-4 lg:w-56 flex-shrink-0">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <div>
              <p className="text-xs font-medium text-medium-gray uppercase tracking-wide">
                Right now
              </p>
              <p className="text-4xl font-semibold text-charcoal leading-tight">
                {liveLoading && !live ? '—' : fmtCount(liveCount)}
              </p>
              <p className="text-xs text-medium-gray">active visitor{liveCount === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1">
            <MiniList title="Top countries" items={live?.byCountry} />
            <MiniList title="Top pages" items={live?.byPage} />
            <MiniList title="By device" items={live?.byDevice} />
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      {reportLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : reportError ? (
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
      ) : kpis.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((k) => (
            <StatCard key={k.title} title={k.title} value={k.value} icon={k.icon} />
          ))}
        </div>
      ) : (
        !notConfigured && (
          <Card>
            <p className="text-medium-gray text-center py-8">No data for this range</p>
          </Card>
        )
      )}

      {/* Trend chart */}
      {!reportLoading && totals && (
        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-1">Traffic over time</h3>
          <p className="text-xs text-medium-gray mb-4">
            Active users, sessions and page views per day.
          </p>
          {report?.timeseries && report.timeseries.length > 0 ? (
            <GaTrendChart data={report.timeseries} />
          ) : (
            <p className="text-medium-gray text-center py-12">No data for this range</p>
          )}
        </Card>
      )}

      {/* Acquisition */}
      {!reportLoading && totals && (
        <>
          <SectionTitle>Acquisition</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Channels</h3>
              {report?.channels && report.channels.length > 0 ? (
                <GaBarChart data={report.channels} />
              ) : (
                <p className="text-medium-gray text-center py-8">No data for this range</p>
              )}
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Traffic sources</h3>
              {report?.sources && report.sources.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-gray">
                      <th className="text-left py-2 font-medium text-medium-gray">Source</th>
                      <th className="text-left py-2 font-medium text-medium-gray">Medium</th>
                      <th className="text-right py-2 font-medium text-medium-gray">Sessions</th>
                      <th className="text-right py-2 font-medium text-medium-gray">Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sources.map((s, i) => (
                      <tr
                        key={`${s.source}-${s.medium}-${i}`}
                        className="border-b border-light-gray last:border-0"
                      >
                        <td className="py-2 text-charcoal truncate">{s.source || '(direct)'}</td>
                        <td className="py-2 text-medium-gray truncate">{s.medium || '(none)'}</td>
                        <td className="py-2 text-right text-charcoal font-medium tabular-nums">
                          {fmtCount(s.sessions)}
                        </td>
                        <td className="py-2 text-right text-medium-gray tabular-nums">
                          {fmtCount(s.users)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-medium-gray text-center py-8">No data for this range</p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Engagement */}
      {!reportLoading && totals && (
        <>
          <SectionTitle>Engagement</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Top pages</h3>
              <BreakdownTable data={report?.pages} labelHead="Path" valueHead="Views" />
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Landing pages</h3>
              <BreakdownTable data={report?.landingPages} labelHead="Path" valueHead="Sessions" />
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Top events</h3>
              <BreakdownTable data={report?.events} labelHead="Event" valueHead="Count" />
            </Card>
          </div>
        </>
      )}

      {/* Audience */}
      {!reportLoading && totals && (
        <>
          <SectionTitle>Audience</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Devices</h3>
              {report?.devices && report.devices.length > 0 ? (
                <GaDonutChart data={report.devices} />
              ) : (
                <p className="text-medium-gray text-center py-8">No data for this range</p>
              )}
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">New vs returning</h3>
              {report?.newVsReturning && report.newVsReturning.length > 0 ? (
                <GaDonutChart data={report.newVsReturning} />
              ) : (
                <p className="text-medium-gray text-center py-8">No data for this range</p>
              )}
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Countries</h3>
              <BreakdownTable
                data={report?.countries}
                labelHead="Country"
                valueHead="Active users"
              />
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Cities</h3>
              <BreakdownTable data={report?.cities} labelHead="City" valueHead="Active users" />
            </Card>
            <Card className="lg:col-span-2">
              <h3 className="text-base font-semibold text-charcoal mb-4">Browsers</h3>
              {report?.browsers && report.browsers.length > 0 ? (
                <GaBarChart data={report.browsers} />
              ) : (
                <p className="text-medium-gray text-center py-8">No data for this range</p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Ecommerce */}
      {!reportLoading && totals && (
        <>
          <SectionTitle>Ecommerce</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Total Revenue" value={fmtInr(ecom?.totalRevenue)} icon={IndianRupee} />
            <StatCard title="Transactions" value={fmtCount(ecom?.transactions)} icon={Receipt} />
            <StatCard
              title="Purchases"
              value={fmtCount(ecom?.ecommercePurchases)}
              icon={ShoppingCart}
            />
            <StatCard
              title="Cart-to-View Rate"
              value={fmtPct(ecom?.cartToViewRate)}
              icon={Target}
            />
          </div>
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Top items</h3>
            {report?.topItems && report.topItems.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray">
                    <th className="text-left py-2 font-medium text-medium-gray">Item</th>
                    <th className="text-right py-2 font-medium text-medium-gray">Views</th>
                    <th className="text-right py-2 font-medium text-medium-gray">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topItems.map((it, i) => (
                    <tr
                      key={`${it.name}-${i}`}
                      className="border-b border-light-gray last:border-0"
                    >
                      <td className="py-2 text-charcoal truncate max-w-0 w-full">
                        {it.name || '(not set)'}
                      </td>
                      <td className="py-2 text-right text-medium-gray tabular-nums whitespace-nowrap">
                        {fmtCount(it.views)}
                      </td>
                      <td className="py-2 text-right text-charcoal font-medium tabular-nums whitespace-nowrap">
                        {fmtInr(it.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-medium-gray text-center py-4">No data for this range</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
