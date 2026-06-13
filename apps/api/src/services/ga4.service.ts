import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { logger } from '../config/logger';

/**
 * Google Analytics 4 (Data API) integration.
 *
 * Powers the admin "Website Analytics" page + the live-visitors widget on the
 * dashboard. The GA4 Data API authenticates with a Google Cloud SERVICE
 * ACCOUNT — a plain API key cannot read it. Credentials + property id are read
 * straight from process.env under a range of common variable names so we pick
 * up whatever was set in Railway without forcing a rename-and-redeploy.
 *
 * Everything degrades gracefully: if nothing is configured (or the wrong kind
 * of credential was supplied) every method returns `{ configured: false }`
 * with a human-readable hint rather than throwing, so the dashboard renders a
 * setup banner instead of a 500.
 */

// ---------------------------------------------------------------------------
// Credential + property resolution (tolerant of how the env var was named)
// ---------------------------------------------------------------------------

type Creds = { client_email: string; private_key: string };

// Full service-account JSON pasted into a single env var.
const JSON_CRED_VARS = [
  'GA_SERVICE_ACCOUNT_JSON',
  'GA4_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  'GOOGLE_CREDENTIALS',
  'GA_CREDENTIALS_JSON',
];
// Split form: email + private key in separate vars.
const EMAIL_VARS = ['GA_CLIENT_EMAIL', 'GOOGLE_CLIENT_EMAIL', 'GA4_CLIENT_EMAIL'];
const KEY_VARS = ['GA_PRIVATE_KEY', 'GOOGLE_PRIVATE_KEY', 'GA4_PRIVATE_KEY'];
// Numeric property id (we strip everything but digits, so "properties/123" works).
const PROPERTY_VARS = [
  'GA_PROPERTY_ID',
  'GA4_PROPERTY_ID',
  'GOOGLE_ANALYTICS_PROPERTY_ID',
  'GA_PROPERTY',
];
// A plain Google API key — detected only so we can tell the user it won't work.
const API_KEY_VARS = [
  'GA_API_KEY',
  'GOOGLE_ANALYTICS_API_KEY',
  'GA_DATA_API_KEY',
  'GOOGLE_API_KEY',
];

function firstEnv(names: string[]): { name: string; value: string } | null {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return { name: n, value: v.trim() };
  }
  return null;
}

/** Railway/.env commonly mangle PEM keys to single-line with literal "\n". */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function resolveCreds(): { creds: Creds | null; source: string; sawApiKey: boolean } {
  const sawApiKey = !!firstEnv(API_KEY_VARS);

  const jsonVar = firstEnv(JSON_CRED_VARS);
  if (jsonVar) {
    try {
      const parsed = JSON.parse(jsonVar.value);
      if (parsed.client_email && parsed.private_key) {
        return {
          creds: {
            client_email: parsed.client_email,
            private_key: normalizePrivateKey(parsed.private_key),
          },
          source: jsonVar.name,
          sawApiKey,
        };
      }
      logger.warn(`[ga4] ${jsonVar.name} is valid JSON but has no client_email/private_key`);
    } catch {
      logger.warn(`[ga4] ${jsonVar.name} is set but is not valid service-account JSON`);
    }
  }

  const emailVar = firstEnv(EMAIL_VARS);
  const keyVar = firstEnv(KEY_VARS);
  if (emailVar && keyVar) {
    return {
      creds: {
        client_email: emailVar.value,
        private_key: normalizePrivateKey(keyVar.value),
      },
      source: `${emailVar.name}+${keyVar.name}`,
      sawApiKey,
    };
  }

  return { creds: null, source: '', sawApiKey };
}

const { creds, source: credSource, sawApiKey } = resolveCreds();

let dataClient: BetaAnalyticsDataClient | null = null;
if (creds) {
  try {
    dataClient = new BetaAnalyticsDataClient({
      credentials: { client_email: creds.client_email, private_key: creds.private_key },
    });
    logger.info(`[ga4] Data API client initialised (creds from ${credSource})`);
  } catch (err) {
    logger.error({ err }, '[ga4] failed to construct Data API client');
  }
}

let cachedPropertyId: string | null = null;
const explicitProperty = firstEnv(PROPERTY_VARS);
if (explicitProperty) {
  const digits = explicitProperty.value.replace(/[^0-9]/g, '');
  if (digits) cachedPropertyId = digits;
}

/** Resolve the GA4 property id — explicit env wins, else auto-discover via Admin API. */
async function resolvePropertyId(): Promise<string | null> {
  if (cachedPropertyId) return cachedPropertyId;
  if (!creds) return null;
  try {
    const adminClient = new AnalyticsAdminServiceClient({
      credentials: { client_email: creds.client_email, private_key: creds.private_key },
    });
    const [summaries] = await adminClient.listAccountSummaries();
    for (const acct of summaries) {
      const prop = acct.propertySummaries?.[0];
      if (prop?.property) {
        cachedPropertyId = prop.property.replace('properties/', '');
        logger.info(
          `[ga4] auto-discovered property ${cachedPropertyId} (${prop.displayName ?? 'unnamed'})`
        );
        return cachedPropertyId;
      }
    }
    logger.warn('[ga4] service account authenticated but sees no GA4 properties');
  } catch (err) {
    logger.warn(
      { err: (err as Error)?.message },
      '[ga4] property auto-discovery failed (set GA_PROPERTY_ID explicitly)'
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tiny TTL cache — GA Data API has per-property quotas and the dashboard polls.
// ---------------------------------------------------------------------------

const cache = new Map<string, { at: number; ttl: number; val: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < hit.ttl) return hit.val as T;
  const val = await fn();
  cache.set(key, { at: now, ttl: ttlMs, val });
  return val;
}

// ---------------------------------------------------------------------------
// Response shaping helpers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowsToPairs(resp: any): { label: string; value: number }[] {
  return (resp?.rows ?? []).map((r: any) => ({
    label: r.dimensionValues?.[0]?.value || '(not set)',
    value: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

function metricsToObject(resp: any): Record<string, number> {
  const headers: string[] = (resp?.metricHeaders ?? []).map((h: any) => h.name);
  const values = resp?.rows?.[0]?.metricValues ?? [];
  const out: Record<string, number> = {};
  headers.forEach((h, i) => {
    out[h] = Number(values[i]?.value ?? 0);
  });
  return out;
}

/** "YYYYMMDD" (GA date dimension) → "YYYY-MM-DD". */
function fmtGaDate(d: string): string {
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
}

function toGaDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolve a [startDate, endDate] window (YYYY-MM-DD) from loose query input. */
function resolveRange(start?: string, end?: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = end ? toGaDate(new Date(end)) : toGaDate(now);
  let startDate: string;
  if (start) {
    startDate = toGaDate(new Date(start));
  } else {
    const s = new Date(now);
    s.setDate(now.getDate() - 27); // default: last 28 days
    startDate = toGaDate(s);
  }
  return { startDate, endDate };
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

function configHint(propertyId: string | null): string | null {
  if (!dataClient) {
    return sawApiKey
      ? 'A Google API key was found in the environment, but the GA4 Data API needs a service-account credential (client_email + private_key). Paste the service-account JSON into Railway as GA_SERVICE_ACCOUNT_JSON.'
      : 'No GA4 service-account credentials found. Add the service-account JSON to Railway as GA_SERVICE_ACCOUNT_JSON (or GA_CLIENT_EMAIL + GA_PRIVATE_KEY).';
  }
  if (!propertyId) {
    return 'Credentials are valid, but no GA4 property is accessible. Set GA_PROPERTY_ID, or grant the service-account email Viewer access on the GA4 property (GA Admin → Property Access Management).';
  }
  return null;
}

export const ga4Service = {
  resolveRange,

  /** Diagnostic — what's configured, which var supplied it, resolved property. */
  async getStatus() {
    const propertyId = await resolvePropertyId();
    return {
      configured: !!dataClient && !!propertyId,
      hasCredentials: !!dataClient,
      credentialSource: credSource || null,
      serviceAccountEmail: creds?.client_email ?? null,
      propertyId,
      hint: configHint(propertyId),
    };
  },

  /** Realtime active users (live visitors) + a few live breakdowns. */
  async getRealtime() {
    const propertyId = await resolvePropertyId();
    if (!dataClient || !propertyId) {
      return { configured: false, activeUsers: 0, byCountry: [], byPage: [], byDevice: [] };
    }
    const property = `properties/${propertyId}`;
    return cached(`rt:${propertyId}`, 15_000, async () => {
      const safe = async (req: any) => {
        try {
          const [resp] = await dataClient!.runRealtimeReport({ property, ...req });
          return resp;
        } catch (err) {
          logger.warn({ err: (err as Error)?.message }, '[ga4] realtime sub-report failed');
          return { rows: [] };
        }
      };
      const [overall, byCountry, byPage, byDevice] = await Promise.all([
        safe({ metrics: [{ name: 'activeUsers' }] }),
        safe({
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 10,
        }),
        safe({
          dimensions: [{ name: 'unifiedScreenName' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 10,
        }),
        safe({ dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }] }),
      ]);
      return {
        configured: true,
        activeUsers: Number((overall as any).rows?.[0]?.metricValues?.[0]?.value ?? 0),
        byCountry: rowsToPairs(byCountry),
        byPage: rowsToPairs(byPage),
        byDevice: rowsToPairs(byDevice),
      };
    });
  },

  /** Full historical report for the date window — everything the dashboard shows. */
  async getReport(startDate: string, endDate: string) {
    const propertyId = await resolvePropertyId();
    if (!dataClient || !propertyId) {
      return { configured: false, hint: configHint(propertyId), range: { startDate, endDate } };
    }
    const property = `properties/${propertyId}`;
    const dateRanges = [{ startDate, endDate }];
    return cached(`rep:${propertyId}:${startDate}:${endDate}`, 5 * 60_000, async () => {
      const safe = async (label: string, req: any) => {
        try {
          const [resp] = await dataClient!.runReport({ property, dateRanges, ...req });
          return resp;
        } catch (err) {
          logger.warn({ err: (err as Error)?.message }, `[ga4] report '${label}' failed`);
          return { rows: [] };
        }
      };

      const [
        totals,
        timeseries,
        channels,
        sources,
        pages,
        landing,
        devices,
        countries,
        cities,
        browsers,
        events,
        newVsReturning,
        ecommerce,
        topItems,
      ] = await Promise.all([
        safe('totals', {
          metrics: [
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
            { name: 'engagementRate' },
            { name: 'eventCount' },
            { name: 'conversions' },
          ],
        }),
        safe('timeseries', {
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
          limit: 400,
        }),
        safe('channels', {
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 12,
        }),
        safe('sources', {
          dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 15,
        }),
        safe('pages', {
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 15,
        }),
        safe('landing', {
          dimensions: [{ name: 'landingPagePlusQueryString' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 15,
        }),
        safe('devices', {
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        }),
        safe('countries', {
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 15,
        }),
        safe('cities', {
          dimensions: [{ name: 'city' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 12,
        }),
        safe('browsers', {
          dimensions: [{ name: 'browser' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 8,
        }),
        safe('events', {
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 15,
        }),
        safe('newVsReturning', {
          dimensions: [{ name: 'newVsReturning' }],
          metrics: [{ name: 'activeUsers' }],
        }),
        safe('ecommerce', {
          metrics: [
            { name: 'totalRevenue' },
            { name: 'transactions' },
            { name: 'ecommercePurchases' },
            { name: 'cartToViewRate' },
          ],
        }),
        safe('topItems', {
          dimensions: [{ name: 'itemName' }],
          metrics: [{ name: 'itemsViewed' }, { name: 'itemRevenue' }],
          orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
          limit: 12,
        }),
      ]);

      return {
        configured: true,
        range: { startDate, endDate },
        totals: metricsToObject(totals),
        ecommerce: metricsToObject(ecommerce),
        timeseries: ((timeseries as any).rows ?? []).map((r: any) => ({
          date: fmtGaDate(r.dimensionValues?.[0]?.value ?? ''),
          activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
          sessions: Number(r.metricValues?.[1]?.value ?? 0),
          pageViews: Number(r.metricValues?.[2]?.value ?? 0),
        })),
        channels: rowsToPairs(channels),
        sources: ((sources as any).rows ?? []).map((r: any) => ({
          source: r.dimensionValues?.[0]?.value || '(direct)',
          medium: r.dimensionValues?.[1]?.value || '(none)',
          sessions: Number(r.metricValues?.[0]?.value ?? 0),
          users: Number(r.metricValues?.[1]?.value ?? 0),
        })),
        pages: rowsToPairs(pages),
        landingPages: rowsToPairs(landing),
        devices: rowsToPairs(devices),
        countries: rowsToPairs(countries),
        cities: rowsToPairs(cities),
        browsers: rowsToPairs(browsers),
        events: rowsToPairs(events),
        newVsReturning: rowsToPairs(newVsReturning),
        topItems: ((topItems as any).rows ?? []).map((r: any) => ({
          name: r.dimensionValues?.[0]?.value || '(not set)',
          views: Number(r.metricValues?.[0]?.value ?? 0),
          revenue: Number(r.metricValues?.[1]?.value ?? 0),
        })),
      };
    });
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */
